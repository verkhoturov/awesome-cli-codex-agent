import { useStdout } from 'ink';
import { assertNever } from '../../../utils/assert-never.js';
import type { UiMessageKind } from '../../contracts.js';
import { Text } from './common/Text.js';

interface MessageProps {
  kind: UiMessageKind;
  text: string;
}

export function Message({ kind, text }: MessageProps) {
  const { stdout } = useStdout();
  const fittedText = fitSeparators(text, stdout.columns);

  switch (kind) {
    case 'agent':
      return (
        <Text color="green" debugLabel="Message case=agent">
          {fittedText}
        </Text>
      );
    case 'error':
      return (
        <Text color="red" debugLabel="Message case=error">
          {fittedText}
        </Text>
      );
    case 'status':
      return (
        <Text debugLabel="Message case=status" dimColor>
          {fittedText}
        </Text>
      );
    case 'system':
      return (
        <Text bold color="cyan" debugLabel="Message case=system">
          {fittedText}
        </Text>
      );
    case 'warning':
      return (
        <Text color="yellow" debugLabel="Message case=warning">
          {fittedText}
        </Text>
      );
    case 'workflow':
      return (
        <Text color="magenta" debugLabel="Message case=workflow">
          {fittedText}
        </Text>
      );
    case 'info':
      return <Text debugLabel="Message case=info">{fittedText}</Text>;
    default:
      return assertNever(kind, 'Unhandled Ink message kind');
  }
}

function fitSeparators(text: string, columns: number | undefined): string {
  const width = Math.max(1, (columns || 80) - 1);
  return text.replace(/^-{20,}$/gmu, '-'.repeat(width));
}
