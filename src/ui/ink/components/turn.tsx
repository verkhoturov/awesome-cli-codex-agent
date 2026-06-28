import { Box, Text } from 'ink';
import { useEffect, useState } from 'react';

import { assertNever } from '../../../utils/assert-never.js';
import type { TurnBlock, TurnView } from '../model.js';

interface TurnProps {
  active?: boolean;
  turn: TurnView;
}

export function Turn({ active = false, turn }: TurnProps) {
  return (
    <Box flexDirection="column">
      {renderTurnBlocks(turn, active)}
      {active ? <WorkingStatus turn={turn} /> : null}
    </Box>
  );
}

function renderTurnBlocks(turn: TurnView, active: boolean) {
  const activityBlocks = turn.blocks.filter(block => block.kind === 'activity');
  let renderedActivityGroup = false;

  return turn.blocks.map(block => {
    if (block.kind === 'activity') {
      if (renderedActivityGroup) {
        return null;
      }

      renderedActivityGroup = true;
      return (
        <ActivityGroup
          active={active}
          blocks={activityBlocks}
          expanded={turn.activityExpanded}
          key="activity-group"
        />
      );
    }

    return <TurnBlockView key={block.id} block={block} />;
  });
}

interface ActivityGroupProps {
  active: boolean;
  blocks: TurnBlock[];
  expanded: boolean;
}

function ActivityGroup({ active, blocks, expanded }: ActivityGroupProps) {
  const label = activityGroupLabel(blocks);
  const hint = active ? ` - press A to ${expanded ? 'collapse' : 'expand'}` : '';

  if (!expanded) {
    return (
      <Text color="cyan">
        {label} ({blocks.length}) collapsed{hint}
      </Text>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color="cyan">
        {label} ({blocks.length}) expanded{hint}
      </Text>
      {blocks.map(block => (
        <Text color="cyan" key={block.id}>
          {block.text}
        </Text>
      ))}
    </Box>
  );
}

function activityGroupLabel(blocks: ActivityGroupProps['blocks']): string {
  return blocks.every(block => block.text.startsWith('[command]')) ? 'Commands' : 'Actions';
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
