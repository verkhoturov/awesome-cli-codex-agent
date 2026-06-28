import { Box, Text } from 'ink';

import type { CliTextSuggestion } from '../../contracts.js';

interface CommandPaletteProps {
  selectedIndex: number;
  suggestions: CliTextSuggestion[];
}

export function CommandPalette({ selectedIndex, suggestions }: CommandPaletteProps) {
  return (
    <Box flexDirection="column" marginTop={1}>
      {suggestions.map((suggestion, index) => {
        const selected = index === selectedIndex;
        return (
          <Text backgroundColor={selected ? 'gray' : undefined} key={suggestion.value}>
            {selected ? '> ' : '  '}
            {suggestion.label} {suggestion.description}
          </Text>
        );
      })}
    </Box>
  );
}
