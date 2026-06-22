import type { AppServerClient } from '../../app-server/client.js';
import { type AppServerEvent, decodeAppServerEvent } from '../../app-server/events.js';
import { interruptTurn, startThread, startTurn } from '../../app-server/session.js';
import type { ThreadTokenUsage, TurnCompletedParams } from '../../app-server/types.js';
import type { AgentProfile, CliState } from '../../types.js';
import type { CliUi } from '../../ui/contracts.js';
import { emitMessage } from '../../ui/output.js';

export type TurnOutputMode = 'activity' | 'full' | 'silent';

export interface TurnRunRequest {
  input: string;
  label?: string;
  outputMode: TurnOutputMode;
  outputSchema?: Record<string, unknown>;
  profile: AgentProfile;
  threadId?: string;
}

export interface TurnRunResult {
  finalText: string;
  threadId: string;
  tokenUsage?: ThreadTokenUsage;
}

interface ActiveTurn {
  interruptRequested: boolean;
  interruptSent: boolean;
  threadId?: string;
  turnId?: string;
  uiId: string;
}

export class TurnRunner {
  private activeTurn?: ActiveTurn;
  private nextUiTurnId = 1;

  constructor(
    private readonly state: CliState,
    private readonly client: AppServerClient,
    private readonly ui: CliUi,
  ) {}

  get isActive(): boolean {
    return this.activeTurn !== undefined;
  }

  interrupt(): boolean {
    const activeTurn = this.activeTurn;

    if (!activeTurn) {
      return false;
    }

    if (activeTurn.interruptRequested) {
      return true;
    }

    activeTurn.interruptRequested = true;
    this.ui.emit({ id: activeTurn.uiId, type: 'turnInterruptRequested' });
    if (activeTurn.turnId && activeTurn.threadId) {
      activeTurn.interruptSent = true;
      void interruptTurn(this.client, activeTurn.threadId, activeTurn.turnId).catch(error => {
        activeTurn.interruptSent = false;
        const message = error instanceof Error ? error.message : String(error);
        this.ui.emit({ id: activeTurn.uiId, message, type: 'turnInterruptFailed' });
      });
    }

    return true;
  }

  async run(request: TurnRunRequest): Promise<TurnRunResult> {
    if (this.activeTurn) {
      throw new Error('A Codex turn is already running');
    }

    const uiId = `turn-${this.nextUiTurnId++}`;
    const activeTurn: ActiveTurn = {
      interruptRequested: false,
      interruptSent: false,
      uiId,
    };

    const bufferedEvents: AppServerEvent[] = [];
    let displayFinished = false;
    let renderedStreamedText = false;
    let streamedText = '';
    let tokenUsage: ThreadTokenUsage | undefined;

    this.activeTurn = activeTurn;
    this.ui.emit({ id: uiId, label: request.label || request.profile.role, type: 'turnStarted' });

    let resolveCompletion: (params: TurnCompletedParams) => void = () => undefined;
    let rejectCompletion: (error: Error) => void = () => undefined;

    const completion = new Promise<TurnCompletedParams>((resolve, reject) => {
      resolveCompletion = resolve;
      rejectCompletion = reject;
    });

    let rejectDisconnected: (error: Error) => void = () => undefined;

    const disconnected = new Promise<never>((_resolve, reject) => {
      rejectDisconnected = reject;
    });

    const handleEvent = (event: AppServerEvent): void => {
      if (!activeTurn.turnId) {
        bufferedEvents.push(event);
        return;
      }

      if (!belongsToActiveTurn(event, activeTurn.threadId, activeTurn.turnId)) {
        return;
      }

      if (event.type === 'agentMessageDelta') {
        streamedText += event.delta;
      }

      if (event.type === 'tokenUsage') {
        tokenUsage = event.tokenUsage;
        return;
      }

      if (event.type === 'turnCompleted') {
        resolveCompletion(event.completion);
        return;
      }

      if (event.type === 'protocolError') {
        rejectCompletion(new Error(event.message));
        return;
      }

      if (shouldRender(event, request.outputMode)) {
        this.ui.emit({ event, id: uiId, type: 'turnEvent' });
        if (event.type === 'agentMessageDelta' && event.delta) {
          renderedStreamedText = true;
        }
      }
    };

    const unsubscribeNotification = this.client.onNotification(notification => {
      const event = decodeAppServerEvent(notification);
      if (event) {
        handleEvent(event);
      }
    });

    const unsubscribeExit = this.client.onExit(rejectDisconnected);

    try {
      activeTurn.threadId =
        request.threadId ||
        (await Promise.race([
          startThread(this.client, {
            approvalPolicy: this.state.approvalPolicy,
            cwd: this.state.cwd,
            developerInstructions: request.profile.developerInstructions,
            ephemeral: request.profile.ephemeral,
            model: request.profile.model,
            reasoningEffort: request.profile.reasoningEffort,
            sandbox: request.profile.sandbox,
          }),
          disconnected,
        ]));

      activeTurn.turnId = await Promise.race([
        startTurn(this.client, {
          approvalPolicy: this.state.approvalPolicy,
          cwd: this.state.cwd,
          effort: request.profile.reasoningEffort,
          input: request.input,
          model: request.profile.model,
          outputSchema: request.outputSchema,
          threadId: activeTurn.threadId,
        }),
        disconnected,
      ]);

      for (const event of bufferedEvents) {
        handleEvent(event);
      }

      if (activeTurn.interruptRequested && !activeTurn.interruptSent) {
        activeTurn.interruptSent = true;
        await interruptTurn(this.client, activeTurn.threadId, activeTurn.turnId);
      }

      const completed = await Promise.race([completion, disconnected]);
      this.ui.emit({ id: uiId, type: 'turnFinished' });
      displayFinished = true;

      const finalText = findFinalAgentMessage(completed) || streamedText;
      if (request.outputMode === 'full' && !renderedStreamedText && finalText) {
        emitMessage(this.ui, `agent> ${finalText}\n`, 'agent');
      }
      if (completed.turn.status === 'failed') {
        throw new Error(completed.turn.error?.message || `${request.profile.role} turn failed`);
      }

      if (completed.turn.status === 'interrupted') {
        throw new Error(`${request.profile.role} turn was interrupted`);
      }

      if (!finalText) {
        throw new Error(`${request.profile.role} returned no final response`);
      }

      return { finalText, threadId: activeTurn.threadId, tokenUsage };
    } finally {
      unsubscribeNotification();
      unsubscribeExit();

      if (!displayFinished) {
        this.ui.emit({ id: uiId, type: 'turnFinished' });
      }

      this.activeTurn = undefined;
    }
  }
}

function belongsToActiveTurn(
  event: AppServerEvent,
  threadId: string | undefined,
  turnId: string,
): boolean {
  return !(
    (threadId && event.threadId && event.threadId !== threadId) ||
    (event.turnId && event.turnId !== turnId)
  );
}

function shouldRender(event: AppServerEvent, mode: TurnOutputMode): boolean {
  if (mode === 'full') {
    return !['protocolError', 'tokenUsage', 'turnCompleted'].includes(event.type);
  }
  if (mode === 'activity') {
    return ![
      'agentMessageDelta',
      'protocolError',
      'reasoningDelta',
      'tokenUsage',
      'turnCompleted',
    ].includes(event.type);
  }
  return event.type === 'error' || event.type === 'warning';
}

function findFinalAgentMessage(completed: TurnCompletedParams): string {
  const messages = (completed.turn.items || []).filter(item => item.type === 'agentMessage');
  const last = messages.at(-1);
  return last?.text || '';
}
