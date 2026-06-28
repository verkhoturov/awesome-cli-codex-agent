import type { RenderableAppServerEvent } from '../../app-server/events.js';
import type { FileChange, ThreadItem } from '../../app-server/types.js';
import { assertNever } from '../../utils/assert-never.js';
import type { TurnBlockKind, TurnView } from './model.js';

export function projectTurnEvent(turn: TurnView, event: RenderableAppServerEvent): TurnView {
  switch (event.type) {
    case 'reasoningDelta':
      return appendDelta(turn, 'reasoning', '[reasoning] ', event.delta);
    case 'agentMessageDelta':
      return appendDelta(turn, 'answer', 'agent> ', event.delta);
    case 'commandOutputDelta':
      return appendDelta(turn, 'commandOutput', '', event.delta);
    case 'filePatch':
      return appendFileChanges(turn, event.changes);
    case 'itemStarted':
      return projectItemStarted(turn, event.item);
    case 'itemCompleted':
      return projectItemCompleted(turn, event.item);
    case 'error':
      return appendTurnBlock(turn, 'error', `[error] ${event.message}`);
    case 'warning':
      return appendTurnBlock(turn, 'warning', `[warning] ${event.message}`);
    default:
      return assertNever(event, 'Unhandled Ink turn event');
  }
}

function projectItemStarted(turn: TurnView, item: ThreadItem): TurnView {
  switch (item.type) {
    case 'commandExecution':
      return appendTurnBlock(turn, 'activity', `[command] ${item.command || 'shell command'}`);
    case 'mcpToolCall':
      return appendTurnBlock(
        turn,
        'activity',
        `[mcp] ${item.server || 'server'}/${item.tool || 'tool'}`,
      );
    case 'webSearch':
      return appendTurnBlock(turn, 'activity', `[web search] ${item.query || ''}`);
    case 'fileChange':
      return appendFileChanges(turn, item.changes);
    case 'collabAgentToolCall':
      return appendTurnBlock(
        turn,
        'activity',
        `[subagent] ${item.tool || 'activity'}${item.model ? ` model=${item.model}` : ''}`,
      );
    case 'subAgentActivity':
      return appendTurnBlock(
        turn,
        'activity',
        `[subagent ${item.kind || 'activity'}] ${item.agentPath || item.agentThreadId || ''}`,
      );
    default:
      return turn;
  }
}

function projectItemCompleted(turn: TurnView, item: ThreadItem): TurnView {
  if (item.type === 'commandExecution') {
    return typeof item.exitCode === 'number' && item.exitCode !== 0
      ? appendTurnBlock(turn, 'error', `[command failed] exit=${item.exitCode}`)
      : turn;
  }

  if (item.type === 'collabAgentToolCall') {
    const states = Object.entries(item.agentsStates || {})
      .map(([threadId, state]) => `${threadId}=${state.status}`)
      .join(', ');
    return appendTurnBlock(
      turn,
      'activity',
      `[subagent ${item.status || 'completed'}] ${item.tool || 'activity'}${states ? ` ${states}` : ''}`,
    );
  }

  return turn;
}

function appendFileChanges(turn: TurnView, changes: FileChange[] | undefined): TurnView {
  let next = turn;
  for (const change of changes || []) {
    if (next.changedFiles.includes(change.path)) {
      continue;
    }
    next = {
      ...appendTurnBlock(next, 'file', `[file ${change.kind}] ${change.path}`),
      changedFiles: [...next.changedFiles, change.path],
    };
  }
  return next;
}

function appendDelta(
  turn: TurnView,
  kind: Extract<TurnBlockKind, 'answer' | 'commandOutput' | 'reasoning'>,
  prefix: string,
  delta: string,
): TurnView {
  if (!delta) {
    return turn;
  }
  const last = turn.blocks.at(-1);
  if (last?.kind === kind) {
    return {
      ...turn,
      blocks: [...turn.blocks.slice(0, -1), { ...last, text: last.text + delta }],
    };
  }
  return appendTurnBlock(turn, kind, prefix + delta);
}

export function appendTurnBlock(turn: TurnView, kind: TurnBlockKind, text: string): TurnView {
  if (!text) {
    return turn;
  }

  const nextId = (turn.blocks.at(-1)?.id || 0) + 1;

  return { ...turn, blocks: [...turn.blocks, { id: nextId, kind, text }] };
}
