import { type AppServerClient, type CliTextSuggestion, type CliUi, resumeThread } from '@/adapters';
import { DEFAULT_REASONING_EFFORT } from '@/app/config.js';
import {
  agentProfile,
  type CliState,
  isReasoningEffort,
  isSandboxMode,
  type ReasoningEffort,
} from '@/core';
import { printStatus, printWelcome } from '../session/output.js';

export type CommandResult = 'continue' | 'exit' | 'logout';

export interface CommandContext {
  client: AppServerClient;
  state: CliState;
  ui: CliUi;
}

interface CliCommand {
  description: string;
  execute(context: CommandContext, args: string[]): CommandResult | Promise<CommandResult>;
  names: readonly [string, ...string[]];
  usage: string;
}

const COMMANDS: CliCommand[] = [
  {
    description: 'Show commands',
    execute: ({ ui }) => {
      ui.emit({ kind: 'system', text: `${commandHelp()}\n`, type: 'message' });
      return 'continue';
    },
    names: ['/help'],
    usage: '/help',
  },
  {
    description: 'Start a new conversation',
    execute: ({ state, ui }) => {
      resetConversation(state);
      ui.emit({ kind: 'status', text: 'Started a new agent conversation.\n', type: 'message' });
      return 'continue';
    },
    names: ['/new'],
    usage: '/new',
  },
  {
    description: 'Resume a saved agent thread',
    execute: resumeSavedThread,
    names: ['/resume'],
    usage: '/resume <thread-id>',
  },
  {
    description: 'Show current configuration',
    execute: ({ state, ui }) => {
      printStatus(ui, state);
      return 'continue';
    },
    names: ['/status'],
    usage: '/status',
  },
  {
    description: 'Show the active agent configuration',
    execute: ({ state, ui }) => {
      const profile = agentProfile(state);
      ui.emit({
        kind: 'status',
        text: `agent: ${profile.model} (${profile.reasoningEffort}), sandbox=${profile.sandbox}, thread=${state.conversation.threadId || 'not started'}, delegation=disabled\n`,
        type: 'message',
      });
      return 'continue';
    },
    names: ['/agents'],
    usage: '/agents',
  },
  {
    description: 'Show or change the primary agent model and effort',
    execute: changeModel,
    names: ['/model'],
    usage: '/model [model] [effort]',
  },
  {
    description: 'Show or set read-only/workspace-write',
    execute: changePermissions,
    names: ['/permissions'],
    usage: '/permissions [mode]',
  },
  {
    description: 'Clear the screen and start a new thread',
    execute: ({ state, ui }) => {
      ui.emit({ type: 'clear' });
      resetConversation(state);
      printWelcome(ui, state);
      return 'continue';
    },
    names: ['/clear'],
    usage: '/clear',
  },
  {
    description: 'Log out of Codex and exit the CLI',
    execute: logout,
    names: ['/logout'],
    usage: '/logout',
  },
  {
    description: 'Exit the CLI',
    execute: () => 'exit',
    names: ['/exit', '/quit'],
    usage: '/exit',
  },
];

const COMMAND_BY_NAME = new Map(
  COMMANDS.flatMap(command => command.names.map(name => [name, command])),
);

export async function handleCommand(
  input: string,
  context: CommandContext,
): Promise<CommandResult> {
  const [name, ...args] = input.trim().split(/\s+/);
  const command = name ? COMMAND_BY_NAME.get(name) : undefined;
  if (!command) {
    context.ui.emit({
      kind: 'error',
      text: `Unknown command: ${name || input}. Run /help.\n`,
      type: 'message',
    });
    return 'continue';
  }
  return command.execute(context, args);
}

export function commandHelp(): string {
  const usageWidth = Math.max(...COMMANDS.map(command => command.usage.length)) + 2;
  return COMMANDS.map(command => `${command.usage.padEnd(usageWidth)}${command.description}`).join(
    '\n',
  );
}

export function commandSuggestions(): CliTextSuggestion[] {
  return COMMANDS.map(command => ({
    aliases: command.names.slice(1),
    description: command.description,
    label: command.usage,
    value: commandValue(command),
  }));
}

function commandValue(command: CliCommand): string {
  const name = command.names[0];
  return command.usage.includes(' ') ? `${name} ` : name;
}

async function resumeSavedThread(
  { client, state, ui }: CommandContext,
  args: string[],
): Promise<CommandResult> {
  const threadId = args.join(' ').trim();
  if (!threadId) {
    ui.emit({
      kind: 'error',
      text: `Usage: /resume <thread-id>${state.conversation.threadId ? `\nCurrent: ${state.conversation.threadId}` : ''}\n`,
      type: 'message',
    });
    return 'continue';
  }

  const profile = agentProfile(state);
  const resumedThreadId = await resumeThread(client, threadId, {
    approvalPolicy: state.approvalPolicy,
    cwd: state.cwd,
    developerInstructions: profile.developerInstructions,
    ephemeral: profile.ephemeral,
    model: profile.model,
    reasoningEffort: profile.reasoningEffort,
    sandbox: profile.sandbox,
  });

  resetConversation(state);
  state.conversation.threadId = resumedThreadId;

  ui.emit({ kind: 'status', text: `Resumed agent thread ${resumedThreadId}.\n`, type: 'message' });

  return 'continue';
}

function changeModel({ state, ui }: CommandContext, args: string[]): CommandResult {
  if (args.length === 0) {
    ui.emit({
      kind: 'status',
      text: `Agent: ${state.model} (reasoning: ${state.reasoningEffortOverride || DEFAULT_REASONING_EFFORT})\n`,
      type: 'message',
    });
    return 'continue';
  }

  const settings = parseModelSettings(args);

  if (!settings) {
    ui.emit({
      kind: 'error',
      text: 'Usage: /model <model> [none|minimal|low|medium|high|xhigh]\n',
      type: 'message',
    });
    return 'continue';
  }

  state.model = settings.model;
  state.reasoningEffortOverride = settings.effort;
  resetConversation(state);

  ui.emit({
    kind: 'status',
    text: `Agent changed to ${state.model} (${describePrimaryEffort(state)}). Started a new conversation.\n`,
    type: 'message',
  });

  return 'continue';
}

function changePermissions({ state, ui }: CommandContext, args: string[]): CommandResult {
  const mode = args.join(' ').trim();

  if (!mode) {
    ui.emit({
      kind: 'status',
      text: `Sandbox: ${state.sandbox}; approvals: ${state.approvalPolicy}\n`,
      type: 'message',
    });
    return 'continue';
  }

  if (!isSandboxMode(mode)) {
    ui.emit({
      kind: 'error',
      text: 'Usage: /permissions <read-only|workspace-write>\n',
      type: 'message',
    });
    return 'continue';
  }

  state.sandbox = mode;
  resetConversation(state);
  ui.emit({
    kind: 'status',
    text: `Agent sandbox changed to ${mode}. Started a new conversation.\n`,
    type: 'message',
  });

  return 'continue';
}

async function logout({ ui }: CommandContext, args: string[]): Promise<CommandResult> {
  if (args.length > 0) {
    ui.emit({ kind: 'error', text: 'Usage: /logout\n', type: 'message' });

    return 'continue';
  }

  const answer = await ui.request({
    defaultValue: 'no',
    options: [
      { aliases: ['y'], label: 'Yes', value: 'yes' },
      { aliases: ['n'], label: 'No', value: 'no' },
    ],
    prompt: 'Log out of Codex and exit? [y/N] ',
    type: 'choice',
  });

  if (answer !== 'yes') {
    ui.emit({ kind: 'status', text: 'Logout cancelled.\n', type: 'message' });

    return 'continue';
  }

  ui.emit({ kind: 'status', text: 'Closing the session before logout...\n', type: 'message' });

  return 'logout';
}

function resetConversation(state: CliState): void {
  state.conversation = {};
}

function describePrimaryEffort(state: CliState): string {
  if (state.reasoningEffortOverride) {
    return `${state.reasoningEffortOverride}, fixed reasoning`;
  }

  return `${DEFAULT_REASONING_EFFORT} reasoning`;
}

interface ModelSettings {
  effort?: ReasoningEffort;
  model: string;
}

function parseModelSettings(args: string[]): ModelSettings | undefined {
  const [model, effort] = args;
  if (!model || args.length > 2) {
    return undefined;
  }

  let parsedEffort: ReasoningEffort | undefined;

  if (effort) {
    if (!isReasoningEffort(effort)) {
      return undefined;
    }
    parsedEffort = effort;
  }

  return { effort: parsedEffort, model };
}
