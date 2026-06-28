import { spawnSync } from 'node:child_process';

import { ensureCodexHome } from './codex-home.js';
import type { NativeAuthenticationSelection } from './types.js';

const CREDENTIAL_STORE_OVERRIDE = 'cli_auth_credentials_store="file"';

export class NativeCodexAuth {
  constructor(private readonly codexHome: string) {}

  login(selection: NativeAuthenticationSelection): void {
    ensureCodexHome(this.codexHome);

    const args = ['login', '-c', CREDENTIAL_STORE_OVERRIDE];

    if (selection.method === 'device-code') {
      args.push('--device-auth');
    } else if (selection.method === 'api-key') {
      args.push('--with-api-key');
    } else if (selection.method === 'access-token') {
      args.push('--with-access-token');
    }

    const usesCredential = selection.credential !== undefined;

    const result = spawnSync('codex', args, {
      encoding: 'utf8',
      env: this.environment(),
      input: usesCredential ? `${selection.credential}\n` : undefined,
      stdio: usesCredential ? ['pipe', 'inherit', 'inherit'] : 'inherit',
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error('Codex authentication was cancelled or failed');
    }
  }

  logout(): string {
    ensureCodexHome(this.codexHome);
    const result = spawnSync('codex', ['logout', '-c', CREDENTIAL_STORE_OVERRIDE], {
      encoding: 'utf8',
      env: this.environment(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error(result.stderr.trim() || 'Unable to log out of Codex');
    }

    return result.stdout.trim() || result.stderr.trim() || 'Logged out';
  }

  status(): string | undefined {
    ensureCodexHome(this.codexHome);

    const result = spawnSync('codex', ['login', '-c', CREDENTIAL_STORE_OVERRIDE, 'status'], {
      encoding: 'utf8',
      env: this.environment(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status === 0) {
      return result.stdout.trim() || result.stderr.trim() || 'logged in';
    }

    if (result.status === 1 && result.stderr.trim() === 'Not logged in') {
      return undefined;
    }

    throw new Error(result.stderr.trim() || 'Unable to check Codex authentication');
  }

  private environment(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      CODEX_HOME: this.codexHome,
    };
  }
}
