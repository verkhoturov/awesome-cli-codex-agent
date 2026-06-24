import type { CliTextSuggestion } from '../../contracts.js';
import { Box } from './common/Box.js';
import { Text } from './common/Text.js';

interface CommandPaletteProps {
  selectedIndex: number;
  suggestions: CliTextSuggestion[];
}

export function CommandPalette({ selectedIndex, suggestions }: CommandPaletteProps) {
  return (
    <Box debugLabel="Prompt command palette" flexDirection="column" marginTop={1}>
      {suggestions.map((suggestion, index) => {
        const selected = index === selectedIndex;
        return (
          <Text
            backgroundColor={selected ? 'gray' : undefined}
            debugLabel={`Prompt command palette item selected=${selected}`}
            key={suggestion.value}>
            {selected ? '> ' : '  '}
            {suggestion.label} {suggestion.description}
          </Text>
        );
      })}
    </Box>
  );
}
