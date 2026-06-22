import type { TurnRunner } from '../cli/turn/runner.js';
import type { CliState } from '../types.js';
import type { CliUi } from '../ui/protocol.js';
import { SingleAgentRunner } from './single-agent-runner.js';
import { WorkflowRunner } from './workflow-runner.js';

export class AgentRunner {
  private readonly singleAgentRunner: SingleAgentRunner;
  private readonly workflowRunner: WorkflowRunner;

  constructor(
    private readonly state: CliState,
    private readonly turnRunner: TurnRunner,
    ui: CliUi,
  ) {
    this.singleAgentRunner = new SingleAgentRunner(state, turnRunner, ui);
    this.workflowRunner = new WorkflowRunner(state, turnRunner, ui);
  }

  interrupt(): boolean {
    return this.turnRunner.interrupt();
  }

  async run(input: string): Promise<void> {
    if (this.state.agentMode === 'single') {
      await this.singleAgentRunner.run(input);
      return;
    }
    await this.workflowRunner.run(input);
  }
}
