import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { useState } from 'react';

import type { PromptView } from '../model.js';

interface PromptProps {
  history: string[];
  onSubmit: (id: number, value: string) => void;
  prompt: PromptView;
}

export function Prompt({ history, onSubmit, prompt }: PromptProps) {
  const { request } = prompt;
  const [value, setValue] = useState('');
  const [draft, setDraft] = useState('');
  const [historyIndex, setHistoryIndex] = useState(history.length);
  
  const usesHistory = request.type === 'text' && request.history;

  useInput(
    (_input, key) => {
      if (!usesHistory || history.length === 0) {
        return;
      }
      if (key.upArrow) {
        if (historyIndex === history.length) {
          setDraft(value);
        }
        const nextIndex = Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIndex);
        setValue(history[nextIndex] || '');
      } else if (key.downArrow) {
        const nextIndex = Math.min(history.length, historyIndex + 1);
        setHistoryIndex(nextIndex);
        setValue(nextIndex === history.length ? draft : history[nextIndex] || '');
      }
    },
    { isActive: Boolean(usesHistory) },
  );

  const handleChange = (nextValue: string): void => {
    setValue(nextValue);
    if (historyIndex !== history.length) {
      setHistoryIndex(history.length);
      setDraft('');
    }
  };

  const promptText = request.prompt.replace(/^\n/u, '');

  return (
    <Box flexDirection="column" marginTop={request.prompt.startsWith('\n') ? 1 : 0}>
      {request.type === 'choice' && request.description ? (
        <Text>{request.description.replace(/\n+$/u, '')}</Text>
      ) : null}
      {request.type === 'choice' && request.displayOptions
        ? request.options.map((option, index) => (
            <Text key={`${option.value}-${index}`}>
              {'  '}
              {index + 1}. {option.label}
            </Text>
          ))
        : null}
      <Box>
        <Text color="blue">{promptText}</Text>
        <TextInput
          focus
          highlightPastedText
          mask={request.type === 'secret' ? '*' : undefined}
          onChange={handleChange}
          onSubmit={answer => onSubmit(prompt.id, answer)}
          value={value}
        />
      </Box>
    </Box>
  );
}
