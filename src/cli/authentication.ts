import type { NativeCodexAuth } from '../auth/native-codex-auth.js';
import {
  isNativeAuthenticationMethod,
  type NativeAuthenticationMethod,
  type NativeAuthenticationSelection,
} from '../auth/types.js';
import type { CliUi } from '../ui/protocol.js';

const AUTHENTICATION_OPTIONS = [
  { label: 'Sign in with ChatGPT in a browser', value: 'browser' },
  { label: 'Sign in with ChatGPT using a device code', value: 'device-code' },
  { label: 'OpenAI API key', value: 'api-key' },
  { label: 'ChatGPT access token', value: 'access-token' },
] as const;

export async function ensureCodexAuthentication(
  authentication: NativeCodexAuth,
  ui: CliUi,
  forceLogin: boolean,
): Promise<string> {
  const savedAuthentication = authentication.status();
  if (savedAuthentication && !forceLogin) {
    return savedAuthentication;
  }

  ui.emit({
    kind: 'status',
    text: savedAuthentication
      ? `Current authentication: ${savedAuthentication}\n`
      : 'No saved Codex authentication found.\n',
    type: 'message',
  });

  const selection = await promptForAuthentication(ui);
  await ui.withTerminalReleased(() => authentication.login(selection));

  const updatedAuthentication = authentication.status();
  if (!updatedAuthentication) {
    throw new Error('Codex CLI did not save authentication');
  }
  return updatedAuthentication;
}

async function promptForAuthentication(ui: CliUi): Promise<NativeAuthenticationSelection> {
  let method: NativeAuthenticationMethod | undefined;

  while (!method) {
    const answer = await ui.request({
      defaultValue: 'browser',
      description: 'Choose a Codex authentication method:\n',
      displayOptions: true,
      options: [...AUTHENTICATION_OPTIONS],
      prompt: 'Authentication method [1]: ',
      type: 'choice',
    });

    if (isNativeAuthenticationMethod(answer)) {
      method = answer;
    } else {
      ui.emit({ kind: 'error', text: 'Enter 1, 2, 3, or 4.\n', type: 'message' });
    }
  }

  if (method === 'api-key') {
    return { credential: await requireSecret(ui, 'OpenAI API key: '), method };
  }

  if (method === 'access-token') {
    return { credential: await requireSecret(ui, 'ChatGPT access token: '), method };
  }

  return { method };
}

async function requireSecret(ui: CliUi, prompt: string): Promise<string> {
  const secret = (await ui.request({ prompt, type: 'secret' })).trim();
  
  if (!secret) {
    throw new Error('Authentication credential is required');
  }

  return secret;
}
