import type { RenderableAppServerEvent } from '../../app-server/events.js';
import type { FileChange, ThreadItem } from '../../app-server/protocol.js';

type OpenLine = 'answer' | 'command' | 'reasoning';

export interface TextTurnOutputState {
  beforeWrite?: () => void;
  changedFiles: Set<string>;
  openLine?: OpenLine;
  write: (value: string) => void;
}

export function createTextTurnOutputState(
  writeOutput: (value: string) => void,
  beforeWrite?: () => void,
): TextTurnOutputState {
  return {
    beforeWrite,
    changedFiles: new Set(),
    write: writeOutput,
  };
}

export function renderTextTurnEvent(
  event: RenderableAppServerEvent,
  output: TextTurnOutputState,
): void {
  switch (event.type) {
    case 'reasoningDelta':
      renderDelta(output, 'reasoning', '[reasoning] ', event.delta);
      return;
    case 'agentMessageDelta':
      renderDelta(output, 'answer', 'agent> ', event.delta);
      return;
    case 'commandOutputDelta':
      renderDelta(output, 'command', '', event.delta);
      return;
    case 'filePatch':
      renderFileChanges(output, event.changes);
      return;
    case 'itemStarted':
      renderItemStarted(output, event.item);
      return;
    case 'itemCompleted':
      renderItemCompleted(output, event.item);
      return;
    case 'error':
      closeOpenLine(output);
      write(output, `[error] ${event.message}\n`);
      return;
    case 'warning':
      closeOpenLine(output);
      write(output, `[warning] ${event.message}\n`);
      return;
    default:
      assertNever(event);
  }
}

export function finishTextTurnOutput(output: TextTurnOutputState): void {
  closeOpenLine(output);
}

function renderItemStarted(output: TextTurnOutputState, item: ThreadItem): void {
  switch (item.type) {
    case 'commandExecution':
      closeOpenLine(output);
      write(output, `[command] ${item.command || 'shell command'}\n`);
      return;
    case 'mcpToolCall':
      closeOpenLine(output);
      write(output, `[mcp] ${item.server || 'server'}/${item.tool || 'tool'}\n`);
      return;
    case 'webSearch':
      closeOpenLine(output);
      write(output, `[web search] ${item.query || ''}\n`);
      return;
    case 'fileChange':
      renderFileChanges(output, item.changes);
      return;
    case 'collabAgentToolCall':
      closeOpenLine(output);
      write(
        output,
        `[subagent] ${item.tool || 'activity'}${item.model ? ` model=${item.model}` : ''}\n`,
      );
      return;
    case 'subAgentActivity':
      closeOpenLine(output);
      write(
        output,
        `[subagent ${item.kind || 'activity'}] ${item.agentPath || item.agentThreadId || ''}\n`,
      );
  }
}

function renderItemCompleted(output: TextTurnOutputState, item: ThreadItem): void {
  if (item.type === 'commandExecution') {
    closeLine(output, 'command');
    if (typeof item.exitCode === 'number' && item.exitCode !== 0) {
      write(output, `[command failed] exit=${item.exitCode}\n`);
    }
    return;
  }
  if (item.type === 'collabAgentToolCall') {
    closeOpenLine(output);
    const states = Object.entries(item.agentsStates || {})
      .map(([threadId, state]) => `${threadId}=${state.status}`)
      .join(', ');
    write(
      output,
      `[subagent ${item.status || 'completed'}] ${item.tool || 'activity'}${states ? ` ${states}` : ''}\n`,
    );
  }
}

function renderFileChanges(output: TextTurnOutputState, changes: FileChange[] | undefined): void {
  for (const change of changes || []) {
    if (output.changedFiles.has(change.path)) {
      continue;
    }
    output.changedFiles.add(change.path);
    closeOpenLine(output);
    write(output, `[file ${change.kind}] ${change.path}\n`);
  }
}

function renderDelta(
  output: TextTurnOutputState,
  line: OpenLine,
  prefix: string,
  delta: string,
): void {
  if (!delta) {
    return;
  }
  openLine(output, line, prefix);
  write(output, delta);
}

function openLine(output: TextTurnOutputState, line: OpenLine, prefix: string): void {
  if (output.openLine === line) {
    return;
  }
  closeOpenLine(output);
  if (prefix) {
    write(output, prefix);
  }
  output.openLine = line;
}

function closeLine(output: TextTurnOutputState, line: OpenLine): void {
  if (output.openLine === line) {
    closeOpenLine(output);
  }
}

function closeOpenLine(output: TextTurnOutputState): void {
  if (output.openLine) {
    write(output, '\n');
    output.openLine = undefined;
  }
}

function write(output: TextTurnOutputState, value: string): void {
  output.beforeWrite?.();
  output.write(value);
}

function assertNever(value: never): never {
  throw new Error(`Unhandled app-server event: ${JSON.stringify(value)}`);
}
