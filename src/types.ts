import type { TokenUsageBreakdown } from './app-server/types.js';

export const SANDBOX_MODES = ['read-only', 'workspace-write'] as const;
export const REASONING_EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'] as const;

export type SandboxMode = (typeof SANDBOX_MODES)[number];
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export const AGENT_ROLES = ['agent'] as const;

export type AgentRole = (typeof AGENT_ROLES)[number];

export interface AgentProfile {
  developerInstructions: string;
  ephemeral: boolean;
  model: string;
  reasoningEffort: ReasoningEffort;
  role: AgentRole;
  sandbox: SandboxMode;
}

export interface ConversationState {
  threadId?: string;
  usageByRole: Partial<Record<AgentRole, TokenUsageBreakdown>>;
}

export function isSandboxMode(value: string): value is SandboxMode {
  return SANDBOX_MODES.some(mode => mode === value);
}

export function isReasoningEffort(value: string): value is ReasoningEffort {
  return REASONING_EFFORTS.some(effort => effort === value);
}

export interface CliState {
  approvalPolicy: 'never' | 'on-request' | 'untrusted';
  codexHome: string;
  conversation: ConversationState;
  cwd: string;
  model: string;
  reasoningEffortOverride?: ReasoningEffort;
  sandbox: SandboxMode;
}
