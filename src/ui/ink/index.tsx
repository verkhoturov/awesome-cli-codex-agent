import { type Instance, render } from 'ink';

import type { CliInputRequest, CliUi, CliUiEvent } from '../contracts.js';
import { resolveInput } from '../resolve-input.js';
import { InkApp } from './app.js';
import { UiDebugProvider } from './components/common/ui-debug.js';
import { InkUiStore } from './store.js';

interface PendingInput {
  id: number;
  reject: (error: Error) => void;
  request: CliInputRequest;
  resolve: (value: string) => void;
}

interface InkCliUiOptions {
  uiDebug?: boolean;
}

export class InkCliUi implements CliUi {
  private bufferedTurnEvents: CliUiEvent[] = [];
  private closed = false;
  private deltaFlushTimer?: ReturnType<typeof setTimeout>;
  private readonly interruptHandlers = new Set<() => void>();
  private instance?: Instance;
  private nextInputId = 1;
  private pendingInput?: PendingInput;
  private readonly store = new InkUiStore();
  private readonly uiDebug: boolean;

  constructor({ uiDebug = false }: InkCliUiOptions = {}) {
    this.uiDebug = uiDebug;
    this.mount();
  }

  get isTTY(): boolean {
    return Boolean(process.stdin.isTTY && process.stdout.isTTY);
  }

  cancelInput(): void {
    const pending = this.pendingInput;
    if (!pending) {
      return;
    }
    this.pendingInput = undefined;
    this.store.cancelPrompt(pending.id);
    pending.reject(new Error('CLI input was cancelled'));
  }

  close(): void {
    if (this.closed) {
      return;
    }
    this.flushTurnEvents();
    this.closed = true;
    this.cancelInput();
    this.instance?.unmount();
    this.instance = undefined;
  }

  emit(event: CliUiEvent): void {
    if (isStreamDelta(event)) {
      this.bufferedTurnEvents.push(event);
      this.deltaFlushTimer ||= setTimeout(() => this.flushTurnEvents(), 16);
      return;
    }
    this.flushTurnEvents();
    this.store.dispatch(event);
    if (event.type === 'clear') {
      this.instance?.clear();
    }
  }

  onInterrupt(handler: () => void): () => void {
    this.interruptHandlers.add(handler);
    return () => this.interruptHandlers.delete(handler);
  }

  request(request: CliInputRequest): Promise<string> {
    if (this.closed) {
      return Promise.reject(new Error('CLI UI is closed'));
    }
    if (this.pendingInput) {
      return Promise.reject(new Error('CLI UI already has an active input request'));
    }

    this.flushTurnEvents();
    const id = this.nextInputId++;
    this.store.showPrompt(id, request);
    return new Promise<string>((resolve, reject) => {
      this.pendingInput = { id, reject, request, resolve };
    });
  }

  async withTerminalReleased<TResult>(
    operation: () => Promise<TResult> | TResult,
  ): Promise<TResult> {
    this.flushTurnEvents();
    await this.unmount();
    this.store.discardRenderedHistory();
    try {
      return await operation();
    } finally {
      if (!this.closed) {
        this.mount();
      }
    }
  }

  private readonly handleInterrupt = (): void => {
    if (this.interruptHandlers.size === 0) {
      this.cancelInput();
      return;
    }
    for (const handler of this.interruptHandlers) {
      handler();
    }
  };

  private readonly handleSubmit = (id: number, answer: string): void => {
    const pending = this.pendingInput;
    if (!pending || pending.id !== id) {
      return;
    }
    const resolvedAnswer = resolveInput(pending.request, answer);
    this.pendingInput = undefined;
    this.store.completePrompt(id, answer, resolvedAnswer);
    pending.resolve(resolvedAnswer);
  };

  private mount(): void {
    this.instance = render(
      <UiDebugProvider enabled={this.uiDebug}>
        <InkApp
          onInterrupt={this.handleInterrupt}
          onSubmit={this.handleSubmit}
          store={this.store}
        />
      </UiDebugProvider>,
      { exitOnCtrlC: false },
    );
  }

  private flushTurnEvents(): void {
    if (this.deltaFlushTimer) {
      clearTimeout(this.deltaFlushTimer);
      this.deltaFlushTimer = undefined;
    }
    if (this.bufferedTurnEvents.length === 0) {
      return;
    }
    const events = this.bufferedTurnEvents;
    this.bufferedTurnEvents = [];
    this.store.dispatchMany(events);
  }

  private async unmount(): Promise<void> {
    const instance = this.instance;
    if (!instance) {
      return;
    }
    this.instance = undefined;
    const exit = instance.waitUntilExit();
    instance.unmount();
    await exit;
  }
}

function isStreamDelta(event: CliUiEvent): boolean {
  return (
    event.type === 'turnEvent' &&
    (event.event.type === 'agentMessageDelta' ||
      event.event.type === 'commandOutputDelta' ||
      event.event.type === 'reasoningDelta')
  );
}
