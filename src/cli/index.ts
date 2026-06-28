import { AgentRunner } from '../agents/agent-runner.js';
import type { AppServerClient } from '../app-server/client.js';
import type { CliState } from '../types.js';
import type { CliUi } from '../ui/contracts.js';
import { type CommandResult, commandSuggestions, handleCommand } from './commands.js';
import { handleServerRequest } from './server-requests/handler.js';
import { PromptQueue } from './server-requests/queue.js';
import { printSessionSummary, printWelcome } from './session-output.js';
import { TurnRunner } from './turn/runner.js';

export async function runCli(
  state: CliState,
  client: AppServerClient,
  ui: CliUi,
  resumeThreadId?: string,
): Promise<Exclude<CommandResult, 'continue'>> {
  let exiting = false;
  let exitResult: Exclude<CommandResult, 'continue'> = 'exit';
  const promptQueue = new PromptQueue();
  const turnRunner = new TurnRunner(state, client, ui);
  const agentRunner = new AgentRunner(state, turnRunner, ui);

  client.setServerRequestHandler(request =>
    promptQueue.run(() => handleServerRequest(request, ui)),
  );

  const unsubscribeInterrupt = ui.onInterrupt(() => {
    if (turnRunner.interrupt()) {
      return;
    }

    exiting = true;
    ui.cancelInput();
  });

  try {
    printWelcome(ui, state);
    if (resumeThreadId) {
      await handleCommand(`/resume ${resumeThreadId}`, { client, state, ui });
    }

    while (!exiting) {
      let input: string;
      try {
        input = (
          await ui.request({
            history: true,
            prompt: '\n',
            suggestions: commandSuggestions(),
            type: 'text',
          })
        ).trim();
      } catch {
        break;
      }

      if (!input) {
        continue;
      }

      if (input.startsWith('/')) {
        const result = await handleCommand(input, { client, state, ui });
        if (result !== 'continue') {
          exitResult = result;
          break;
        }
        continue;
      }

      try {
        await agentRunner.run(input);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ui.emit({
          channel: 'stderr',
          kind: 'error',
          text: `\nError: ${message}\n`,
          type: 'message',
        });
      }
    }
  } finally {
    unsubscribeInterrupt();
    printSessionSummary(ui, state);
  }

  return exitResult;
}
