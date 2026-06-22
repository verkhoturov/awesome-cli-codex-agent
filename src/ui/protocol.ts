import type { RenderableAppServerEvent } from '../app-server/events.js';

export type UiMessageKind =
  | 'agent'
  | 'error'
  | 'info'
  | 'status'
  | 'system'
  | 'warning'
  | 'workflow';

export type CliUiEvent =
  | { channel?: 'stderr' | 'stdout'; kind: UiMessageKind; text: string; type: 'message' }
  | { type: 'clear' }
  | { id: string; label: string; type: 'turnStarted' }
  | { event: RenderableAppServerEvent; id: string; type: 'turnEvent' }
  | { id: string; type: 'turnFinished' }
  | { id: string; type: 'turnInterruptRequested' }
  | { id: string; message: string; type: 'turnInterruptFailed' };

export interface CliChoiceOption {
  aliases?: string[];
  label: string;
  value: string;
}

export type CliInputRequest =
  | { prompt: string; type: 'text' }
  | { prompt: string; type: 'secret' }
  | {
      defaultValue?: string;
      description?: string;
      displayOptions?: boolean;
      options: CliChoiceOption[];
      prompt: string;
      type: 'choice';
    };

export interface CliUi {
  readonly isTTY: boolean;
  cancelInput(): void;
  close(): void;
  emit(event: CliUiEvent): void;
  onInterrupt(handler: () => void): () => void;
  request(request: CliInputRequest): Promise<string>;
  withTerminalReleased<TResult>(operation: () => Promise<TResult> | TResult): Promise<TResult>;
}
