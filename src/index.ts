#!/usr/bin/env node

import { CodexAppServerClient } from './app-server/client.js';
import { NativeCodexAuth } from './auth/native-codex-auth.js';
import { ensureCodexAuthentication } from './cli/authentication.js';
import { runCli } from './cli/index.js';
import { usage } from './cli/usage.js';
import { InkCliUi } from './ui/ink/index.js';
import { checkCodexCli } from './utils/check-codex-cli.js';
import { parseArgs } from './utils/cli-arguments.js';

async function main(): Promise<void> {
  const { forceLogin, help, resumeThreadId, state } = parseArgs(process.argv.slice(2));

  if (help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (!process.stdin.isTTY) {
    throw new Error('Interactive TTY input is required');
  }

  const codexVersion = checkCodexCli();
  const nativeAuthentication = new NativeCodexAuth(state.codexHome);
  const ui = new InkCliUi();

  try {
    const authentication = await ensureCodexAuthentication(nativeAuthentication, ui, forceLogin);
    ui.emit({
      kind: 'status',
      text: `Using ${codexVersion}\nAuthentication: ${authentication}\n\nConnecting to Codex app-server...\n`,
      type: 'message',
    });

    const appServer = new CodexAppServerClient({
      codexHome: state.codexHome,
      cwd: state.cwd,
    });

    let logout = false;

    try {
      await appServer.connect();
      logout = (await runCli(state, appServer, ui, resumeThreadId)) === 'logout';
    } finally {
      await appServer.close();
    }

    if (logout) {
      ui.emit({ kind: 'status', text: `${nativeAuthentication.logout()}\n`, type: 'message' });
    }
  } finally {
    ui.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exitCode = 1;
});
