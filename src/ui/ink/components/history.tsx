import { Box, Text } from 'ink';

import type { HistoryEntry } from '../model.js';
import { Message } from './message.js';
import { Turn } from './turn.js';

export function HistoryEntryView({ entry }: { entry: HistoryEntry }) {
  switch (entry.type) {
    case 'message':
      return (
        <Box flexDirection="column">
          <Message kind={entry.kind} text={entry.text} />
        </Box>
      );
    case 'interaction':
      return (
        <Box flexDirection="column">
          <Text color="blue">{entry.text}</Text>
        </Box>
      );
    case 'turn':
      return <Turn turn={entry.turn} />;
    default:
      return assertNever(entry);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unhandled Ink history entry: ${JSON.stringify(value)}`);
}
