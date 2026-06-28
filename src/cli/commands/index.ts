import { COMMAND_BY_NAME, commandHelp, commandSuggestions } from './registry.js';
import type { CommandContext, CommandResult } from './types.js';

export { commandHelp, commandSuggestions };
export type { CommandContext, CommandResult };

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
