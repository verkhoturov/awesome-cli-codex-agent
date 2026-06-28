import type { TurnRunner } from '../cli/turn/runner.js';
import type { CliState } from '../types.js';
import type { CliUi } from '../ui/contracts.js';
import { addUsage } from './add-usage.js';
import { createAgentProfiles } from './profiles.js';

export class AgentRunner {
  constructor(
    private readonly state: CliState,
    private readonly turnRunner: TurnRunner,
    private readonly ui: CliUi,
  ) {}

  async run(input: string): Promise<void> {
    const profile = createAgentProfiles(this.state).agent;

    this.ui.emit({
      kind: 'agent',
      text: `[agent] ${profile.model} (${profile.reasoningEffort})\n`,
      type: 'message',
    });

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
