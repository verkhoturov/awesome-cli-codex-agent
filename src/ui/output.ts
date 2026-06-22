import type { CliUi, UiMessageKind } from './protocol.js';

export function emitMessage(
  ui: CliUi,
  text: string,
  kind: UiMessageKind = 'info',
  channel: 'stderr' | 'stdout' = 'stdout',
): void {
  ui.emit({ channel, kind, text, type: 'message' });
}
