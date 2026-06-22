import { createAgentProfiles } from '../agents/profiles.js';
import type { AppServerClient } from '../app-server/client.js';
import { resumeThread } from '../app-server/session.js';
import { DEFAULT_REASONING_EFFORT } from '../config.js';
import {
  type CliState,
  isAgentMode,
  isReasoningEffort,
  isSandboxMode,
  MULTI_AGENT_ROLES,
  type ReasoningEffort,
} from '../types.js';
import type { CliUi } from '../ui/contracts.js';
import { emitMessage } from '../ui/output.js';
import { printStatus, printWelcome } from './session-output.js';

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
    execute: showHelp,
    names: ['/help'],
    usage: '/help',
  },
  {
    description: 'Start a new conversation in the current agent mode',
    execute: startNewThread,
    names: ['/new'],
    usage: '/new',
  },
  {
    description: 'Resume a saved thread in the current agent mode',
    execute: resumeSavedThread,
    names: ['/resume'],
    usage: '/resume <thread-id>',
  },
  {
    description: 'Show current configuration',
    execute: showStatus,
    names: ['/status'],
    usage: '/status',
  },
  {
    description: 'Show or switch multi/single agent mode',
    execute: changeAgentMode,
    names: ['/mode'],
    usage: '/mode [multi|single]',
  },
  {
    description: 'Show the active agent configuration',
    execute: showAgents,
    names: ['/agents', '/workflow'],
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
    execute: clearConversation,
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
    emitMessage(context.ui, `Unknown command: ${name || input}. Run /help.\n`, 'error');
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

function showHelp({ ui }: CommandContext): CommandResult {
  emitMessage(ui, `${commandHelp()}\n`, 'system');
  return 'continue';
}

function startNewThread({ state, ui }: CommandContext): CommandResult {
  resetConversation(state);
  emitMessage(ui, `Started a new ${state.agentMode}-agent conversation.\n`, 'status');
  return 'continue';
}

async function resumeSavedThread(
  { client, state, ui }: CommandContext,
  args: string[],
): Promise<CommandResult> {
  const threadId = args.join(' ').trim();
  if (!threadId) {
    emitMessage(
      ui,
      `Usage: /resume <thread-id>${state.conversation.threadId ? `\nCurrent: ${state.conversation.threadId}` : ''}\n`,
      'error',
    );
    return 'continue';
  }
  const profiles = createAgentProfiles(state);
  const profile = state.agentMode === 'single' ? profiles.agent : profiles.coordinator;
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

  const suffix = state.agentMode === 'multi' ? ' Worker threads will start fresh.' : '';
  emitMessage(
    ui,
    `Resumed ${state.agentMode}-agent thread ${resumedThreadId}.${suffix}\n`,
    'status',
  );

  return 'continue';
}

function showStatus({ state, ui }: CommandContext): CommandResult {
  printStatus(ui, state);

  return 'continue';
}

function changeAgentMode({ state, ui }: CommandContext, args: string[]): CommandResult {
  if (args.length === 0) {
    emitMessage(ui, `Agent mode: ${state.agentMode}\n`, 'status');

    return 'continue';
  }

  const mode = args.join(' ').trim();

  if (!isAgentMode(mode)) {
    emitMessage(ui, 'Usage: /mode <multi|single>\n', 'error');

    return 'continue';
  }

  if (mode === state.agentMode) {
    emitMessage(ui, `Agent mode is already ${mode}.\n`, 'status');

    return 'continue';
  }

  state.agentMode = mode;
  resetConversation(state);
  emitMessage(ui, `Agent mode changed to ${mode}. Started a new conversation.\n`, 'status');

  return 'continue';
}

function showAgents({ state, ui }: CommandContext): CommandResult {
  const profiles = createAgentProfiles(state);
  emitMessage(ui, `Agent mode: ${state.agentMode}\n`, 'status');

  if (state.agentMode === 'single') {
    const profile = profiles.agent;
    emitMessage(
      ui,
      `agent: ${profile.model} (${profile.reasoningEffort}), sandbox=${profile.sandbox}, thread=${state.conversation.threadId || 'not started'}, delegation=disabled\n`,
      'status',
    );
    return 'continue';
  }

  for (const role of MULTI_AGENT_ROLES) {
    const profile = profiles[role];
    const threadId = role === 'coordinator' ? state.conversation.threadId : undefined;
    emitMessage(
      ui,
      `${role}: ${profile.model} (${describeEffort(state, role, profile.reasoningEffort)}), sandbox=${profile.sandbox}, thread=${threadId || (profile.ephemeral ? 'ephemeral' : 'not started')}\n`,
      'status',
    );
  }

  if (state.conversation.lastRoute) {
    const agents = state.conversation.lastRoute.agents;
    emitMessage(
      ui,
      `Last route: ${agents.length > 0 ? agents.join(', ') : 'coordinator'}; complexity=${state.conversation.lastRoute.complexity}\n`,
      'status',
    );
  }

  return 'continue';
}

function changeModel({ state, ui }: CommandContext, args: string[]): CommandResult {
  if (args.length === 0) {
    if (state.agentMode === 'single') {
      emitMessage(
        ui,
        `Agent: ${state.model} (reasoning: ${state.reasoningEffortOverride || DEFAULT_REASONING_EFFORT})\n`,
        'status',
      );
      return 'continue';
    }
    emitMessage(
      ui,
      `Implementer: ${state.model} (reasoning: ${state.reasoningEffortOverride || 'dynamic by complexity'})\n`,
      'status',
    );
    return 'continue';
  }

  const settings = parseModelSettings(args);

  if (!settings) {
    emitMessage(ui, 'Usage: /model <model> [none|minimal|low|medium|high|xhigh]\n', 'error');
    return 'continue';
  }

  state.model = settings.model;
  state.reasoningEffortOverride = settings.effort;
  resetConversation(state);
  const label = state.agentMode === 'single' ? 'Agent' : 'Implementer';

  emitMessage(
    ui,
    `${label} changed to ${state.model} (${describePrimaryEffort(state)}). Started a new conversation.\n`,
    'status',
  );

  return 'continue';
}

function changePermissions({ state, ui }: CommandContext, args: string[]): CommandResult {
  const mode = args.join(' ').trim();

  if (!mode) {
    emitMessage(ui, `Sandbox: ${state.sandbox}; approvals: ${state.approvalPolicy}\n`, 'status');
    return 'continue';
  }

  if (!isSandboxMode(mode)) {
    emitMessage(ui, 'Usage: /permissions <read-only|workspace-write>\n', 'error');
    return 'continue';
  }

  state.sandbox = mode;
  resetConversation(state);
  const label = state.agentMode === 'single' ? 'Agent' : 'Implementer';
  emitMessage(ui, `${label} sandbox changed to ${mode}. Started a new conversation.\n`, 'status');

  return 'continue';
}

function clearConversation({ state, ui }: CommandContext): CommandResult {
  ui.emit({ type: 'clear' });
  resetConversation(state);
  printWelcome(ui, state);

  return 'continue';
}

async function logout({ ui }: CommandContext, args: string[]): Promise<CommandResult> {
  if (args.length > 0) {
    emitMessage(ui, 'Usage: /logout\n', 'error');

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
    emitMessage(ui, 'Logout cancelled.\n', 'status');

    return 'continue';
  }

  emitMessage(ui, 'Closing the session before logout...\n', 'status');

  return 'logout';
}

function resetConversation(state: CliState): void {
  state.conversation = { usageByRole: {} };
}

function describeEffort(
  state: CliState,
  role: (typeof MULTI_AGENT_ROLES)[number],
  configured: ReasoningEffort,
): string {
  if (role === 'analyzer') {
    return `dynamic by complexity, normal=${configured}`;
  }

  if (role === 'implementer' && !state.reasoningEffortOverride) {
    return `dynamic by complexity, normal=${configured}`;
  }

  return role === 'implementer' ? `${configured}, fixed override` : configured;
}

function describePrimaryEffort(state: CliState): string {
  if (state.reasoningEffortOverride) {
    return `${state.reasoningEffortOverride}, fixed reasoning`;
  }

  return state.agentMode === 'single'
    ? `${DEFAULT_REASONING_EFFORT} reasoning`
    : 'dynamic reasoning';
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
