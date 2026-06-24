import { PasswordInput, TextInput } from '@inkjs/ui';
import { useInput, useStdout } from 'ink';
import { useState } from 'react';

import type { CliTextSuggestion } from '../../contracts.js';
import type { PromptView } from '../model.js';
import { CommandPalette } from './command-palette.js';
import { Box } from './common/Box.js';
import { Text } from './common/Text.js';

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
  const [inputRevision, setInputRevision] = useState(0);
  const [paletteIndex, setPaletteIndex] = useState(0);
  const { stdout } = useStdout();

  const usesHistory = request.type === 'text' && request.history;
  const textSuggestions = request.type === 'text' ? request.suggestions || [] : [];
  const commandPrefix = request.type === 'text' ? commandPalettePrefix(value) : undefined;
  const commandSuggestions =
    commandPrefix === undefined ? [] : filterCommandSuggestions(textSuggestions, commandPrefix);
  const exactCommandSelected = commandSuggestions.some(suggestion => suggestion.value === value);
  const commandPaletteActive = commandSuggestions.length > 0 && !exactCommandSelected;

  useInput(
    (_input, key) => {
      if (commandPaletteActive) {
        if (key.upArrow) {
          setPaletteIndex(index =>
            commandSuggestions.length === 0
              ? 0
              : (index - 1 + commandSuggestions.length) % commandSuggestions.length,
          );
          return;
        }
        if (key.downArrow) {
          setPaletteIndex(index =>
            commandSuggestions.length === 0 ? 0 : (index + 1) % commandSuggestions.length,
          );
          return;
        }
        if (key.tab) {
          applyCommandSuggestion(commandSuggestions[paletteIndex]);
          return;
        }
        if (key.return) {
          submitCommandSuggestion(commandSuggestions[paletteIndex]);
          return;
        }
      }

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
        setPaletteIndex(0);
        setInputRevision(revision => revision + 1);
      } else if (key.downArrow) {
        const nextIndex = Math.min(history.length, historyIndex + 1);
        setHistoryIndex(nextIndex);
        setValue(nextIndex === history.length ? draft : history[nextIndex] || '');
        setPaletteIndex(0);
        setInputRevision(revision => revision + 1);
      }
    },
    { isActive: Boolean(commandPaletteActive || usesHistory) },
  );

  const applyCommandSuggestion = (suggestion: CliTextSuggestion | undefined): void => {
    if (!suggestion) {
      return;
    }

    setValue(suggestion.value);
    setHistoryIndex(history.length);
    setDraft('');
    setInputRevision(revision => revision + 1);
  };

  const submitCommandSuggestion = (suggestion: CliTextSuggestion | undefined): void => {
    if (!suggestion) {
      return;
    }

    setValue(suggestion.value);
    onSubmit(prompt.id, suggestion.value);
  };

  const handleChange = (nextValue: string): void => {
    if (commandPalettePrefix(nextValue) !== commandPrefix) {
      setPaletteIndex(0);
    }
    setValue(nextValue);
    if (historyIndex !== history.length) {
      setHistoryIndex(history.length);
      setDraft('');
    }
  };

  const handleTextSubmit = (answer: string): void => {
    if (commandPaletteActive) {
      submitCommandSuggestion(commandSuggestions[paletteIndex]);
      return;
    }

    onSubmit(prompt.id, answer);
  };

  const promptText = request.prompt.replace(/^\n/u, '');
  const promptWidth = Math.max(1, (stdout.columns || 80) - 1);

  return (
    <Box
      backgroundColor={'#5a5a5a'}
      debugLabel={`Prompt request=${request.type}`}
      flexDirection="column"
      marginTop={request.prompt.startsWith('\n') ? 1 : 0}
      padding={1}
      width={promptWidth}>
      {request.type === 'choice' && request.description ? (
        <Text debugLabel="Prompt choice description">
          {request.description.replace(/\n+$/u, '')}
        </Text>
      ) : null}
      {request.type === 'choice' && request.displayOptions
        ? request.options.map((option, index) => (
            <Text debugLabel="Prompt choice option" key={`${option.value}-${index}`}>
              {'  '}
              {index + 1}. {option.label}
            </Text>
          ))
        : null}
      <Box debugLabel="Prompt input row" flexDirection="row">
        <Text color="white">{promptText}</Text>
        {request.type === 'secret' ? (
          <PasswordInput onChange={handleChange} onSubmit={answer => onSubmit(prompt.id, answer)} />
        ) : (
          <TextInput
            key={inputRevision}
            defaultValue={value}
            onChange={handleChange}
            onSubmit={handleTextSubmit}
          />
        )}
      </Box>
      {commandPaletteActive ? (
        <CommandPalette selectedIndex={paletteIndex} suggestions={commandSuggestions} />
      ) : null}
    </Box>
  );
}

function commandPalettePrefix(value: string): string | undefined {
  if (!value.startsWith('/') || /\s/u.test(value)) {
    return undefined;
  }
  return value.toLowerCase();
}

function filterCommandSuggestions(
  suggestions: CliTextSuggestion[],
  prefix: string,
): CliTextSuggestion[] {
  return suggestions
    .filter(suggestion =>
      [suggestion.value.trim(), suggestion.label.split(/\s/u)[0], ...(suggestion.aliases || [])]
        .filter((candidate): candidate is string => Boolean(candidate))
        .some(candidate => candidate.toLowerCase().startsWith(prefix)),
    )
    .slice(0, 8);
}
