import { Box, Text, useStdout } from 'ink';

import { assertNever } from '@/shared/assert-never.js';
import type { HistoryEntry } from '../model.js';
import { Message } from './message.js';
import { Turn } from './turn.js';

export function HistoryEntryView({ entry }: { entry: HistoryEntry }) {
  const { stdout } = useStdout();
  const promptWidth = Math.max(1, (stdout.columns || 80) - 1);

  switch (entry.type) {
    case 'message':
      return (
        <Box flexDirection="column">
          <Message kind={entry.kind} text={entry.text} />
        </Box>
      );
    case 'interaction':
      return (
        <Box
          backgroundColor={'#5a5a5a'}
          flexDirection="column"
          marginY={1}
          padding={1}
          width={promptWidth}>
          <Text color="blue">{entry.text.replace(/^\n/u, '')}</Text>
        </Box>
      );
    case 'turn':
      return <Turn turn={entry.turn} />;
    default:
      return assertNever(entry, 'Unhandled Ink history entry');
  }
}
