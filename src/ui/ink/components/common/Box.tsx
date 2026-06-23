import { type BoxProps, Box as InkBox, Text as InkText } from 'ink';
import type { ReactNode } from 'react';

import { DEBUG_BORDER_STYLE, formatDebugLabel } from './debug-style.js';
import { useUiDebug } from './ui-debug.js';

type DebugBoxProps = BoxProps & {
  children?: ReactNode;
  debugLabel?: string;
  debugBgColor?: string;
};

export function Box({ children, debugLabel, debugBgColor, ...props }: DebugBoxProps) {
  const uiDebug = useUiDebug();

  if (!uiDebug) {
    return <InkBox {...props}>{children}</InkBox>;
  }

  return (
    <InkBox
      {...props}
      borderColor="gray"
      borderDimColor
      borderStyle={DEBUG_BORDER_STYLE}
      backgroundColor={debugBgColor}
      flexDirection="column"
      paddingX={1}>
      <InkText dimColor wrap="truncate-end">
        {formatDebugLabel(debugLabel, 'Box')}
      </InkText>
      <InkBox flexDirection={props.flexDirection}>{children}</InkBox>
    </InkBox>
  );
}
