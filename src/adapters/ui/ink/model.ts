import type { CliInputRequest, UiMessageKind } from '../contracts.js';

export type TurnBlockKind =
  | 'activity'
  | 'answer'
  | 'commandOutput'
  | 'error'
  | 'file'
  | 'interaction'
  | 'reasoning'
  | 'status'
  | 'warning';

export interface TurnBlock {
  id: number;
  kind: TurnBlockKind;
  text: string;
}

export interface TurnView {
  activityExpanded: boolean;
  blocks: TurnBlock[];
  changedFiles: string[];
  id: string;
  interrupted: boolean;
  label: string;
  startedAt: number;
}

export type HistoryEntry =
  | {
      id: number;
      kind: UiMessageKind;
      text: string;
      type: 'message';
    }
  | {
      id: number;
      text: string;
      type: 'interaction';
    }
  | {
      id: number;
      turn: TurnView;
      type: 'turn';
    };

export interface PromptView {
  id: number;
  request: CliInputRequest;
}

export interface InkUiSnapshot {
  activeTurn?: TurnView;
  history: HistoryEntry[];
  inputHistory: string[];
  prompt?: PromptView;
  staticGeneration: number;
}
