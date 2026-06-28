import type { CliUi, TokenUsageBreakdown } from '@/adapters';
import { APP_SERVER_CLIENT_INFO } from '@/app/config.js';
import { agentProfile, type CliState } from '@/core';

const numberFormat = new Intl.NumberFormat('en-US');

export function printWelcome(ui: CliUi, state: CliState): void {
  ui.emit({
    kind: 'system',
    text: `
----------------------------------------------------------------------------------

${APP_SERVER_CLIENT_INFO.title} (${APP_SERVER_CLIENT_INFO.version})

${configurationSummary(state)}
Run /help for commands. Ctrl+C cancels the current request or exits while idle.

----------------------------------------------------------------------------------\n`,
    type: 'message',
  });
}

export function printStatus(ui: CliUi, state: CliState): void {
  ui.emit({
    kind: 'status',
    text: `${configurationSummary(state)}\nAgent thread: ${state.conversation.threadId || 'not started'}\n`,
    type: 'message',
  });
}

export function printSessionSummary(ui: CliUi, state: CliState): void {
  const usage = state.conversation.usage || emptyUsage();
  ui.emit({
    kind: 'status',
    text: `\nToken usage: total=${formatNumber(usage.totalTokens)} input=${formatNumber(usage.inputTokens)}${usage.cachedInputTokens ? ` (+ ${formatNumber(usage.cachedInputTokens)} cached)` : ''} output=${formatNumber(usage.outputTokens)}\n`,
    type: 'message',
  });

  if (state.conversation.threadId) {
    const cwd = shellQuote(state.cwd);
    const threadId = shellQuote(state.conversation.threadId);
    const model = shellQuote(state.model);
    const effort = state.reasoningEffortOverride
      ? ` --reasoning-effort ${state.reasoningEffortOverride}`
      : '';
    ui.emit({
      kind: 'status',
      text: `To continue this agent session, run command "npm run resume -- ${threadId} --model ${model}${effort} --sandbox ${state.sandbox} -C ${cwd}"\n`,
      type: 'message',
    });
  }
}

function configurationSummary(state: CliState): string {
  const profile = agentProfile(state);
  const lines = [
    `cwd: ${state.cwd}`,
    `agent: ${profile.model} (${profile.reasoningEffort})`,
    `agent sandbox: ${state.sandbox}`,
  ];
  lines.push(`approvals: ${state.approvalPolicy}`);
  return lines.join('\n');
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function emptyUsage(): TokenUsageBreakdown {
  return {
    cachedInputTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0,
  };
}

function formatNumber(value: number): string {
  return numberFormat.format(value);
}
