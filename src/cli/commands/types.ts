import type { AppServerClient, CliUi } from '@/adapters';
import type { CliState } from '@/core';

export type CommandResult = 'continue' | 'exit' | 'logout';

export interface CommandContext {
  client: AppServerClient;
  state: CliState;
  ui: CliUi;
}

export interface CliCommand {
  description: string;
  execute(context: CommandContext, args: string[]): CommandResult | Promise<CommandResult>;
  names: readonly [string, ...string[]];
  usage: string;
}
