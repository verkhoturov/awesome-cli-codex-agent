import { assertNever } from '../../utils/assert-never.js';
import type { CliInputRequest, CliUiEvent, UiMessageKind } from '../contracts.js';
import type { HistoryEntry, InkUiSnapshot, TurnBlockKind } from './model.js';
import { appendTurnBlock, projectTurnEvent } from './turn-projector.js';

type Listener = () => void;

const INITIAL_SNAPSHOT: InkUiSnapshot = { history: [], inputHistory: [], staticGeneration: 0 };

export class InkUiStore {
  private batchDepth = 0;
  private batchDirty = false;
  private nextHistoryId = 1;
  private snapshot: InkUiSnapshot = INITIAL_SNAPSHOT;
  private readonly listeners = new Set<Listener>();

  getSnapshot = (): InkUiSnapshot => this.snapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  dispatch(event: CliUiEvent): void {
    switch (event.type) {
      case 'message':
        this.appendMessage(event.kind, event.text);
        return;
      case 'clear':
        this.setSnapshot({
          history: [],
          inputHistory: this.snapshot.inputHistory,
          staticGeneration: this.snapshot.staticGeneration + 1,
        });
        return;
      case 'turnStarted':
        this.setSnapshot({
          ...this.snapshot,
          activeTurn: {
            blocks: [],
            changedFiles: [],
            id: event.id,
            interrupted: false,
            label: event.label,
            startedAt: Date.now(),
          },
        });
        return;
      case 'turnEvent':
        if (this.snapshot.activeTurn?.id === event.id) {
          this.setSnapshot({
            ...this.snapshot,
            activeTurn: projectTurnEvent(this.snapshot.activeTurn, event.event),
          });
        }
        return;
      case 'turnInterruptRequested':
        if (this.snapshot.activeTurn?.id === event.id) {
          this.setSnapshot({
            ...this.snapshot,
            activeTurn: {
              ...appendTurnBlock(
                this.snapshot.activeTurn,
                'status',
                '[interrupting current request]',
              ),
              interrupted: true,
            },
          });
        }
        return;
      case 'turnInterruptFailed':
        this.appendToActiveTurn(event.id, 'error', `Interrupt failed: ${event.message}`);
        return;
      case 'turnFinished':
        this.finishTurn(event.id);
        return;
      default:
        assertNever(event, 'Unhandled Ink UI event');
    }
  }

  dispatchMany(events: CliUiEvent[]): void {
    this.batchDepth += 1;
    try {
      for (const event of events) {
        this.dispatch(event);
      }
    } finally {
      this.batchDepth -= 1;
      if (this.batchDepth === 0 && this.batchDirty) {
        this.batchDirty = false;
        this.notify();
      }
    }
  }

  showPrompt(id: number, request: CliInputRequest): void {
    this.setSnapshot({ ...this.snapshot, prompt: { id, request } });
  }

  completePrompt(id: number, answer: string, resolvedAnswer: string): void {
    const prompt = this.snapshot.prompt;
    if (!prompt || prompt.id !== id) {
      return;
    }

    let inputHistory = this.snapshot.inputHistory;
    if (prompt.request.type === 'text' && prompt.request.history && answer.trim()) {
      inputHistory = [...inputHistory, answer.trim()];
    }

    const text = formatInteraction(prompt.request, answer, resolvedAnswer);
    const withoutPrompt = { ...this.snapshot, inputHistory, prompt: undefined };
    if (!text) {
      this.setSnapshot(withoutPrompt);
      return;
    }
    if (withoutPrompt.activeTurn) {
      this.setSnapshot({
        ...withoutPrompt,
        activeTurn: appendTurnBlock(withoutPrompt.activeTurn, 'interaction', text),
      });
      return;
    }
    this.setSnapshot({
      ...withoutPrompt,
      history: [...withoutPrompt.history, this.interactionEntry(text)],
    });
  }

  cancelPrompt(id: number): void {
    if (this.snapshot.prompt?.id === id) {
      this.setSnapshot({ ...this.snapshot, prompt: undefined });
    }
  }

  discardRenderedHistory(): void {
    this.setSnapshot({ ...this.snapshot, history: [] });
  }

  private appendMessage(kind: UiMessageKind, text: string): void {
    const normalized = trimTrailingNewlines(text);
    if (!normalized) {
      return;
    }
    if (this.snapshot.activeTurn) {
      this.setSnapshot({
        ...this.snapshot,
        activeTurn: appendTurnBlock(
          this.snapshot.activeTurn,
          messageKindToTurnKind(kind),
          normalized,
        ),
      });
      return;
    }
    this.setSnapshot({
      ...this.snapshot,
      history: [
        ...this.snapshot.history,
        { id: this.nextHistoryId++, kind, text: normalized, type: 'message' },
      ],
    });
  }

  private appendToActiveTurn(id: string, kind: TurnBlockKind, text: string): void {
    if (this.snapshot.activeTurn?.id !== id) {
      return;
    }
    this.setSnapshot({
      ...this.snapshot,
      activeTurn: appendTurnBlock(this.snapshot.activeTurn, kind, text),
    });
  }

  private finishTurn(id: string): void {
    const turn = this.snapshot.activeTurn;
    if (!turn || turn.id !== id) {
      return;
    }
    const history =
      turn.blocks.length > 0
        ? [...this.snapshot.history, { id: this.nextHistoryId++, turn, type: 'turn' as const }]
        : this.snapshot.history;
    this.setSnapshot({ ...this.snapshot, activeTurn: undefined, history });
  }

  private interactionEntry(text: string): HistoryEntry {
    return { id: this.nextHistoryId++, text, type: 'interaction' };
  }

  private setSnapshot(snapshot: InkUiSnapshot): void {
    this.snapshot = snapshot;
    if (this.batchDepth > 0) {
      this.batchDirty = true;
      return;
    }
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

function formatInteraction(
  request: CliInputRequest,
  answer: string,
  resolvedAnswer: string,
): string {
  if (request.type === 'secret') {
    return `${request.prompt}[hidden]`;
  }
  if (request.type === 'text') {
    return answer ? `${request.prompt}${answer}` : '';
  }

  const options = request.displayOptions
    ? request.options.map((option, index) => `  ${index + 1}. ${option.label}`).join('\n')
    : '';
  const selected = request.options.find(option => option.value === resolvedAnswer);
  return [
    trimTrailingNewlines(request.description || ''),
    options,
    `${request.prompt}${selected?.label || answer || resolvedAnswer}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function trimTrailingNewlines(value: string): string {
  return value.replace(/\n+$/u, '');
}

function messageKindToTurnKind(kind: UiMessageKind): TurnBlockKind {
  if (kind === 'error') {
    return 'error';
  }
  if (kind === 'warning') {
    return 'warning';
  }
  if (kind === 'agent') {
    return 'answer';
  }
  return 'status';
}
