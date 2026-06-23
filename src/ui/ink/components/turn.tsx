import { useEffect, useState } from 'react';

import { assertNever } from '../../../utils/assert-never.js';
import type { TurnBlock, TurnView } from '../model.js';
import { Box } from './common/Box.js';
import { Text } from './common/Text.js';

interface TurnProps {
  active?: boolean;
  turn: TurnView;
}

export function Turn({ active = false, turn }: TurnProps) {
  return (
    <Box debugLabel={`Turn active=${active}`} flexDirection="column">
      {turn.blocks.map(block => (
        <TurnBlockView key={block.id} block={block} />
      ))}
      {active ? <WorkingStatus turn={turn} /> : null}
    </Box>
  );
}

function TurnBlockView({ block }: { block: TurnBlock }) {
  switch (block.kind) {
    case 'answer':
      return (
        <Text color="green" debugLabel="TurnBlockView case=answer">
          {block.text}
        </Text>
      );
    case 'reasoning':
      return (
        <Text debugLabel="TurnBlockView case=reasoning" dimColor>
          {block.text}
        </Text>
      );
    case 'commandOutput':
      return (
        <Text debugLabel="TurnBlockView case=commandOutput" dimColor>
          {block.text}
        </Text>
      );
    case 'activity':
      return (
        <Text color="cyan" debugLabel="TurnBlockView case=activity">
          {block.text}
        </Text>
      );
    case 'file':
      return (
        <Text color="yellow" debugLabel="TurnBlockView case=file">
          {block.text}
        </Text>
      );
    case 'interaction':
      return (
        <Text color="blue" debugLabel="TurnBlockView case=interaction">
          {block.text}
        </Text>
      );
    case 'status':
      return (
        <Text debugLabel="TurnBlockView case=status" dimColor>
          {block.text}
        </Text>
      );
    case 'warning':
      return (
        <Text color="yellow" debugLabel="TurnBlockView case=warning">
          {block.text}
        </Text>
      );
    case 'error':
      return (
        <Text color="red" debugLabel="TurnBlockView case=error">
          {block.text}
        </Text>
      );
    default:
      return assertNever(block.kind, 'Unhandled Ink turn block');
  }
}

function WorkingStatus({ turn }: { turn: TurnView }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => elapsed(turn.startedAt));

  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds(elapsed(turn.startedAt)), 1_000);
    return () => clearInterval(interval);
  }, [turn.startedAt]);

  return turn.interrupted ? (
    <Text color="yellow" debugLabel="WorkingStatus case=interrupted">
      [{turn.label}] interrupting current request
    </Text>
  ) : (
    <Text color="cyan" debugLabel="WorkingStatus case=working">
      [{turn.label}] working ({elapsedSeconds}s, Ctrl+C to interrupt)
    </Text>
  );
}

function elapsed(startedAt: number): number {
  return Math.floor((Date.now() - startedAt) / 1_000);
}
