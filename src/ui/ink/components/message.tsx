import { Text, useStdout } from 'ink';
import { assertNever } from '../../../utils/assert-never.js';
import type { UiMessageKind } from '../../contracts.js';

interface MessageProps {
  kind: UiMessageKind;
  text: string;
}

export function Message({ kind, text }: MessageProps) {
  const { stdout } = useStdout();
  const fittedText = fitSeparators(text, stdout.columns);

  switch (kind) {
    case 'agent':
      return <Text color="green">{fittedText}</Text>;
    case 'error':
      return <Text color="red">{fittedText}</Text>;
    case 'status':
      return <Text dimColor>{fittedText}</Text>;
    case 'system':
      return (
        <Text bold color="cyan">
          {fittedText}
        </Text>
      );
    case 'warning':
      return <Text color="yellow">{fittedText}</Text>;
    case 'workflow':
      return <Text color="magenta">{fittedText}</Text>;
    case 'info':
      return <Text>{fittedText}</Text>;
    default:
      return assertNever(kind, 'Unhandled Ink message kind');
  }
}

function fitSeparators(text: string, columns: number | undefined): string {
  const width = Math.max(1, (columns || 80) - 1);
  return text.replace(/^-{20,}$/gmu, '-'.repeat(width));
}
