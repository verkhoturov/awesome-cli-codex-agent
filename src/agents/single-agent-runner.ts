import type { TurnRunner } from '../cli/turn/runner.js';
import type { CliState } from '../types.js';
import type { CliUi } from '../ui/contracts.js';
import { emitMessage } from '../ui/output.js';
import { createAgentProfiles } from './profiles.js';
import { addUsage } from './usage.js';

export class SingleAgentRunner {
  constructor(
    private readonly state: CliState,
    private readonly turnRunner: TurnRunner,
    private readonly ui: CliUi,
  ) {}

  async run(input: string): Promise<void> {
    const profile = createAgentProfiles(this.state).agent;

    emitMessage(this.ui, `[agent] ${profile.model} (${profile.reasoningEffort})\n`, 'agent');

    const result = await this.turnRunner.run({
      input,
      label: 'agent',
      outputMode: 'full',
      profile,
      threadId: this.state.conversation.threadId,
    });

    this.state.conversation.threadId = result.threadId;

    addUsage(this.state, profile.role, result.tokenUsage?.last);
  }
}
