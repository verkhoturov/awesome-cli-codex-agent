import { assertNever } from '../../../utils/assert-never.js';
import type { HistoryEntry } from '../model.js';
import { Box } from './common/Box.js';
import { Text } from './common/Text.js';
import { Message } from './message.js';
import { Turn } from './turn.js';

export function HistoryEntryView({ entry }: { entry: HistoryEntry }) {
  switch (entry.type) {
    case 'message':
      return (
        <Box debugLabel="HistoryEntryView case=message" flexDirection="column">
          <Message kind={entry.kind} text={entry.text} />
        </Box>
      );
    case 'interaction':
      return (
        <Box debugLabel="HistoryEntryView case=interaction" flexDirection="column">
          <Text color="blue" debugLabel="HistoryEntryView interaction Text">
            {entry.text}
          </Text>
        </Box>
      );
    case 'turn':
      return <Turn turn={entry.turn} />;
    default:
      return assertNever(entry, 'Unhandled Ink history entry');
  }
}
