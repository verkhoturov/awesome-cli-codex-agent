import { Box, Static, useInput } from 'ink';
import { useSyncExternalStore } from 'react';
import { HistoryEntryView } from './components/history.js';
import { Prompt } from './components/prompt.js';
import { Turn } from './components/turn.js';
import type { InkUiStore } from './store.js';

interface InkAppProps {
  onInterrupt: () => void;
  onSubmit: (id: number, value: string) => void;
  store: InkUiStore;
}

export function InkApp({ onInterrupt, onSubmit, store }: InkAppProps) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      onInterrupt();
      return;
    }

    if (input === 'a' && snapshot.activeTurn && !snapshot.prompt) {
      store.toggleActiveTurnActivity();
    }
  });

  return (
    <Box>
      <Static key={snapshot.staticGeneration} items={snapshot.history}>
        {entry => <HistoryEntryView key={entry.id} entry={entry} />}
      </Static>
      {snapshot.activeTurn ? <Turn active turn={snapshot.activeTurn} /> : null}
      {snapshot.prompt ? (
        <Prompt
          key={snapshot.prompt.id}
          history={snapshot.inputHistory}
          onSubmit={onSubmit}
          prompt={snapshot.prompt}
        />
      ) : null}
    </Box>
  );
}
