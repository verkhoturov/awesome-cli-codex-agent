import { createAgentProfiles } from '../agents/profiles.js';
import type { TokenUsageBreakdown } from '../app-server/types.js';
import { APP_SERVER_CLIENT_INFO } from '../config.js';
import { AGENT_ROLES, type CliState } from '../types.js';
import type { CliUi } from '../ui/contracts.js';
import { emitMessage } from '../ui/output.js';

const numberFormat = new Intl.NumberFormat('en-US');

export function printWelcome(ui: CliUi, state: CliState): void {
  emitMessage(
    ui,
    `
----------------------------------------------------------------------------------

${APP_SERVER_CLIENT_INFO.title} (${APP_SERVER_CLIENT_INFO.version})

${configurationSummary(state)}
Run /help for commands. Ctrl+C cancels the current request or exits while idle.

----------------------------------------------------------------------------------\n`,
    'system',
  );
}

export function printStatus(ui: CliUi, state: CliState): void {
  emitMessage(
    ui,
    `${configurationSummary(state)}\nAgent thread: ${state.conversation.threadId || 'not started'}\n`,
    'status',
  );
}

export function printSessionSummary(ui: CliUi, state: CliState): void {
  const usageByRole = state.conversation.usageByRole;
  const total = sumUsage(Object.values(usageByRole));
  emitMessage(
    ui,
    `\nToken usage: total=${formatNumber(total.totalTokens)} input=${formatNumber(total.inputTokens)}${total.cachedInputTokens ? ` (+ ${formatNumber(total.cachedInputTokens)} cached)` : ''} output=${formatNumber(total.outputTokens)}\n`,
    'status',
  );

  for (const role of AGENT_ROLES) {
    const usage = usageByRole[role];
    if (usage) {
      emitMessage(
        ui,
        `  ${role}: total=${formatNumber(usage.totalTokens)} input=${formatNumber(usage.inputTokens)} output=${formatNumber(usage.outputTokens)}\n`,
        'status',
      );
    }
  }

  if (state.conversation.threadId) {
    const cwd = shellQuote(state.cwd);
    const threadId = shellQuote(state.conversation.threadId);
    const model = shellQuote(state.model);
    const effort = state.reasoningEffortOverride
      ? ` --reasoning-effort ${state.reasoningEffortOverride}`
      : '';
    emitMessage(
      ui,
      `To continue this agent session, run command "npm run resume -- ${threadId} --model ${model}${effort} --sandbox ${state.sandbox} -C ${cwd}"\n`,
      'status',
    );
  }
}

function configurationSummary(state: CliState): string {
  const profiles = createAgentProfiles(state);
  const lines = [
    `cwd: ${state.cwd}`,
    `agent: ${profiles.agent.model} (${profiles.agent.reasoningEffort})`,
    `agent sandbox: ${state.sandbox}`,
  ];
  lines.push(`approvals: ${state.approvalPolicy}`);
  return lines.join('\n');
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function sumUsage(usages: Array<TokenUsageBreakdown | undefined>): TokenUsageBreakdown {
  return usages.reduce<TokenUsageBreakdown>(
    (total, usage) => ({
      cachedInputTokens: total.cachedInputTokens + (usage?.cachedInputTokens || 0),
      inputTokens: total.inputTokens + (usage?.inputTokens || 0),
      outputTokens: total.outputTokens + (usage?.outputTokens || 0),
      reasoningOutputTokens: total.reasoningOutputTokens + (usage?.reasoningOutputTokens || 0),
      totalTokens: total.totalTokens + (usage?.totalTokens || 0),
    }),
    {
      cachedInputTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      reasoningOutputTokens: 0,
      totalTokens: 0,
    },
  );
}

function formatNumber(value: number): string {
  return numberFormat.format(value);
}
