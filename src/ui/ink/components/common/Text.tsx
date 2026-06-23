import { Box as InkBox, Text as InkText, type TextProps } from 'ink';

import { DEBUG_BORDER_STYLE, formatDebugLabel } from './debug-style.js';
import { useUiDebug } from './ui-debug.js';

type DebugTextProps = TextProps & {
  debugLabel?: string;
};

export function Text({ children, debugLabel, ...props }: DebugTextProps) {
  const uiDebug = useUiDebug();

  if (!uiDebug) {
    return <InkText {...props}>{children}</InkText>;
  }

  return (
    <InkBox
      borderColor="gray"
      borderDimColor
      borderStyle={DEBUG_BORDER_STYLE}
      flexDirection="column"
      paddingX={1}>
      <InkText dimColor wrap="truncate-end">
        {formatDebugLabel(debugLabel, 'Text')}
      </InkText>
      <InkText {...props}>{children}</InkText>
    </InkBox>
  );
}
