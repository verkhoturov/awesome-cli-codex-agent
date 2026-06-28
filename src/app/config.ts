import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CliState, ReasoningEffort, SandboxMode } from '@/core';

export const APP_SERVER_CLIENT_INFO = {
  name: 'custom_codex_agent',
  title: 'Custom Codex Agent',
  version: '1.0.0',
} as const;

export const DEFAULT_CODEX_HOME = join(
  fileURLToPath(new URL('../..', import.meta.url)),
  '.codex-data',
);

export const DEFAULT_MODEL = 'gpt-5.5';
export const DEFAULT_REASONING_EFFORT: ReasoningEffort = 'medium';
export const DEFAULT_SANDBOX: SandboxMode = 'workspace-write';
export const DEFAULT_APPROVAL_POLICY: CliState['approvalPolicy'] = 'on-request';
