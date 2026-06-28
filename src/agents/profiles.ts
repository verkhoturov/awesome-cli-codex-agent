import { DEFAULT_REASONING_EFFORT } from '../config.js';
import type { AgentProfile, AgentRole, CliState } from '../types.js';

const SINGLE_AGENT_INSTRUCTIONS = `You are a software engineering agent working directly with the user.
Analyze repositories, edit files, run commands, and explain results clearly as needed to complete the user's request.
Work independently. Do not spawn, delegate to, or communicate with subagents under any circumstances.
Read the code before editing, follow repository instructions, keep changes focused, and run the repository's permitted verification commands.`;

export function createAgentProfiles(state: CliState): Record<AgentRole, AgentProfile> {
  return {
    agent: {
      developerInstructions: SINGLE_AGENT_INSTRUCTIONS,
      ephemeral: false,
      model: state.model,
      reasoningEffort: state.reasoningEffortOverride || DEFAULT_REASONING_EFFORT,
      role: 'agent',
      sandbox: state.sandbox,
    },
  };
}
