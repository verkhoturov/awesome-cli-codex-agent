import type { CliTextSuggestion } from '@/adapters';
import { agentProfile } from '@/core';
import { printStatus, printWelcome } from '../session/output.js';
import {
  changeModel,
  changePermissions,
  logout,
  resetConversation,
  resumeSavedThread,
} from './handlers.js';
import type { CliCommand, CommandContext, CommandResult } from './types.js';

const COMMANDS: CliCommand[] = [
  {
    description: 'Show commands',
    execute: showHelp,
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

export const COMMAND_BY_NAME = new Map(
  COMMANDS.flatMap(command => command.names.map(name => [name, command])),
);

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

function showHelp({ ui }: CommandContext): CommandResult {
  ui.emit({ kind: 'system', text: `${commandHelp()}\n`, type: 'message' });
  return 'continue';
}

function commandValue(command: CliCommand): string {
  const name = command.names[0];
  return command.usage.includes(' ') ? `${name} ` : name;
}
