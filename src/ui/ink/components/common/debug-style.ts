import type { BoxProps } from 'ink';

export const DEBUG_BORDER_STYLE = {
  bottom: '┄',
  bottomLeft: '└',
  bottomRight: '┘',
  left: '┆',
  right: '┆',
  top: '┄',
  topLeft: '┌',
  topRight: '┐',
} satisfies NonNullable<BoxProps['borderStyle']>;

export function formatDebugLabel(label: string | undefined, fallback: string): string {
  return `[ui-debug ${label || fallback}]`;
}
