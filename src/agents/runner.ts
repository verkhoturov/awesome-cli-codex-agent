import type { TurnRunner } from '../cli/turn/runner.js';
import type { CliState } from '../types.js';
import type { CliUi } from '../ui/contracts.js';
import { MultiAgentRunner } from './multi-agent-runner.js';
import { SingleAgentRunner } from './single-agent-runner.js';

export class AgentRunner {
  private readonly multiAgentRunner: MultiAgentRunner;
  private readonly singleAgentRunner: SingleAgentRunner;

  constructor(
    private readonly state: CliState,
    private readonly turnRunner: TurnRunner,
    ui: CliUi,
  ) {
    this.multiAgentRunner = new MultiAgentRunner(state, turnRunner, ui);
    this.singleAgentRunner = new SingleAgentRunner(state, turnRunner, ui);
  }

  interrupt(): boolean {
    return this.turnRunner.interrupt();
  }

  async run(input: string): Promise<void> {
    if (this.state.agentMode === 'single') {
      await this.singleAgentRunner.run(input);
      return;
    }
    await this.multiAgentRunner.run(input);
  }
}
