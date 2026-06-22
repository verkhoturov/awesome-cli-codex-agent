import type { CliInputRequest, CliUi, CliUiEvent } from '../protocol.js';
import { TextTerminal } from './terminal.js';
import {
  createTextTurnOutputState,
  finishTextTurnOutput,
  renderTextTurnEvent,
  type TextTurnOutputState,
} from './turn-renderer.js';
import { TextWorkingIndicator } from './working-indicator.js';

interface TextTurnState {
  output: TextTurnOutputState;
  working: TextWorkingIndicator;
}

export class TextCliUi implements CliUi {
  private closed = false;
  private readonly interruptHandlers = new Set<() => void>();
  private terminal = new TextTerminal();
  private unsubscribeTerminalInterrupt?: () => void;
  private readonly turns = new Map<string, TextTurnState>();

  constructor() {
    this.bindInterrupt();
  }

  get isTTY(): boolean {
    return this.terminal.isTTY;
  }

  cancelInput(): void {
    this.terminal.close();
  }

  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.unsubscribeTerminalInterrupt?.();
    for (const turn of this.turns.values()) {
      finishTextTurnOutput(turn.output);
      turn.working.stop();
    }
    this.turns.clear();
    this.terminal.close();
  }

  emit(event: CliUiEvent): void {
    switch (event.type) {
      case 'message':
        this.withIndicatorsHidden(() => {
          if (event.channel === 'stderr') {
            this.terminal.writeError(event.text);
          } else {
            this.terminal.write(event.text);
          }
        });
        return;
      case 'clear':
        this.terminal.clear();
        return;
      case 'turnStarted': {
        const working = new TextWorkingIndicator(this.terminal, event.label);
        const output = createTextTurnOutputState(
          value => this.terminal.write(value),
          () => working.hide(),
        );
        this.turns.set(event.id, { output, working });
        working.start();
        return;
      }
      case 'turnEvent': {
        const turn = this.turns.get(event.id);
        if (!turn) {
          return;
        }
        renderTextTurnEvent(event.event, turn.output);
        if (!turn.output.openLine) {
          turn.working.show();
        }
        return;
      }
      case 'turnFinished': {
        const turn = this.turns.get(event.id);
        if (!turn) {
          return;
        }
        turn.working.hide();
        finishTextTurnOutput(turn.output);
        turn.working.stop();
        this.turns.delete(event.id);
        return;
      }
      case 'turnInterruptRequested': {
        const turn = this.turns.get(event.id);
        turn?.working.hide();
        this.terminal.write('\n[interrupting current request]\n');
        return;
      }
      case 'turnInterruptFailed':
        this.terminal.writeError(`Interrupt failed: ${event.message}\n`);
        return;
      default:
        assertNever(event);
    }
  }

  onInterrupt(handler: () => void): () => void {
    this.interruptHandlers.add(handler);
    return () => this.interruptHandlers.delete(handler);
  }

  async request(request: CliInputRequest): Promise<string> {
    const visibleTurns = this.hideIndicators();
    try {
      if (request.type === 'secret') {
        return await this.terminal.questionSecret(request.prompt);
      }
      if (request.type === 'text') {
        return await this.terminal.question(request.prompt);
      }
      if (request.description) {
        this.terminal.write(request.description);
      }
      if (request.displayOptions) {
        request.options.forEach((option, index) => {
          this.terminal.write(`  ${index + 1}. ${option.label}\n`);
        });
      }
      const answer = (await this.terminal.question(request.prompt)).trim();
      if (!answer && request.defaultValue !== undefined) {
        return request.defaultValue;
      }
      const selectedIndex = Number.parseInt(answer, 10);
      if (!Number.isNaN(selectedIndex)) {
        const selected = request.options[selectedIndex - 1];
        if (selected) {
          return selected.value;
        }
      }
      const normalized = answer.toLowerCase();
      const selected = request.options.find(option =>
        [option.value, ...(option.aliases || [])].some(value => value.toLowerCase() === normalized),
      );
      return selected?.value || answer;
    } finally {
      this.showIndicators(visibleTurns);
    }
  }

  async withTerminalReleased<TResult>(
    operation: () => Promise<TResult> | TResult,
  ): Promise<TResult> {
    this.unsubscribeTerminalInterrupt?.();
    this.terminal.close();
    try {
      return await operation();
    } finally {
      if (!this.closed) {
        this.terminal = new TextTerminal();
        this.bindInterrupt();
      }
    }
  }

  private bindInterrupt(): void {
    this.unsubscribeTerminalInterrupt = this.terminal.onInterrupt(() => {
      for (const handler of this.interruptHandlers) {
        handler();
      }
    });
  }

  private hideIndicators(): TextTurnState[] {
    const turns = [...this.turns.values()];
    for (const turn of turns) {
      turn.working.hide();
    }
    return turns;
  }

  private showIndicators(turns: TextTurnState[]): void {
    for (const turn of turns) {
      turn.working.show();
    }
  }

  private withIndicatorsHidden(operation: () => void): void {
    const turns = this.hideIndicators();
    try {
      operation();
    } finally {
      this.showIndicators(turns);
    }
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled CLI UI event: ${JSON.stringify(value)}`);
}
