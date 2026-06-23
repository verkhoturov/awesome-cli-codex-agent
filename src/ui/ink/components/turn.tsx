import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';

import type { TurnBlock, TurnView } from '../model.js';

interface TurnProps {
  active?: boolean;
  turn: TurnView;
}

export function Turn({ active = false, turn }: TurnProps) {
  return (
    <Box flexDirection="column">
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
      return <Text color="green">{block.text}</Text>;
    case 'reasoning':
      return <Text dimColor>{block.text}</Text>;
    case 'commandOutput':
      return <Text dimColor>{block.text}</Text>;
    case 'activity':
      return <Text color="cyan">{block.text}</Text>;
    case 'file':
      return <Text color="yellow">{block.text}</Text>;
    case 'interaction':
      return <Text color="blue">{block.text}</Text>;
    case 'status':
      return <Text dimColor>{block.text}</Text>;
    case 'warning':
      return <Text color="yellow">{block.text}</Text>;
    case 'error':
      return <Text color="red">{block.text}</Text>;
    default:
      return assertNever(block.kind);
  }
}

function WorkingStatus({ turn }: { turn: TurnView }) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => elapsed(turn.startedAt));

  useEffect(() => {
    const interval = setInterval(() => setElapsedSeconds(elapsed(turn.startedAt)), 1_000);
    return () => clearInterval(interval);
  }, [turn.startedAt]);

  return turn.interrupted ? (
    <Text color="yellow">[{turn.label}] interrupting current request</Text>
  ) : (
    <Text color="cyan">
      [{turn.label}] working ({elapsedSeconds}s, Ctrl+C to interrupt)
    </Text>
  );
}

function elapsed(startedAt: number): number {
  return Math.floor((Date.now() - startedAt) / 1_000);
}

function assertNever(value: never): never {
  throw new Error(`Unhandled Ink turn block: ${String(value)}`);
}
