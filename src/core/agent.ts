import type { CliUi } from '@/adapters/ui/contracts.js';
import { DEFAULT_REASONING_EFFORT } from '@/app/config.js';
import type { TurnRunner } from './turn.js';
import type { AgentProfile, CliState } from './types.js';

const AGENT_INSTRUCTIONS = `You are a software engineering agent working directly with the user.
Analyze repositories, edit files, run commands, and explain results clearly as needed to complete the user's request.
Work independently. Do not spawn, delegate to, or communicate with subagents under any circumstances.
Read the code before editing, follow repository instructions, keep changes focused, and run the repository's permitted verification commands.`;

export function agentProfile(state: CliState): AgentProfile {
  return {
    developerInstructions: AGENT_INSTRUCTIONS,
    ephemeral: false,
    model: state.model,
    reasoningEffort: state.reasoningEffortOverride || DEFAULT_REASONING_EFFORT,
    sandbox: state.sandbox,
  };
}

export async function runAgentTurn(
  state: CliState,
  turnRunner: TurnRunner,
  ui: CliUi,
  input: string,
): Promise<void> {
  const profile = agentProfile(state);

  ui.emit({
    kind: 'agent',
    text: `[agent] ${profile.model} (${profile.reasoningEffort})\n`,
    type: 'message',
  });

  const result = await turnRunner.run({
    input,
    label: 'agent',
    outputMode: 'full',
    profile,
    threadId: state.conversation.threadId,
  });

  state.conversation.threadId = result.threadId;

  const usage = result.tokenUsage?.last;
  if (usage) {
    const current = state.conversation.usage;
    state.conversation.usage = {
      cachedInputTokens: (current?.cachedInputTokens || 0) + usage.cachedInputTokens,
      inputTokens: (current?.inputTokens || 0) + usage.inputTokens,
      outputTokens: (current?.outputTokens || 0) + usage.outputTokens,
      reasoningOutputTokens: (current?.reasoningOutputTokens || 0) + usage.reasoningOutputTokens,
      totalTokens: (current?.totalTokens || 0) + usage.totalTokens,
    };
  }
}
