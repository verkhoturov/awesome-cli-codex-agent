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

  const {
    alignContent,
    alignItems,
    aspectRatio,
    columnGap,
    flexDirection,
    flexWrap,
    gap,
    height,
    justifyContent,
    maxHeight,
    maxWidth,
    minHeight,
    minWidth,
    overflow,
    overflowX,
    overflowY,
    padding,
    paddingBottom,
    paddingLeft,
    paddingRight,
    paddingTop,
    paddingX,
    paddingY,
    rowGap,
    width,
    ...frameProps
  } = props;

  return (
    <InkBox
      {...frameProps}
      aspectRatio={aspectRatio}
      height={height}
      maxHeight={maxHeight}
      maxWidth={maxWidth}
      minHeight={minHeight}
      minWidth={minWidth}
      width={width}
      borderColor="gray"
      borderDimColor
      borderStyle={DEBUG_BORDER_STYLE}
      backgroundColor={debugBgColor ?? props.backgroundColor}
      flexDirection="column"
      paddingX={1}>
      <InkText dimColor wrap="truncate-end">
        {formatDebugLabel(debugLabel, 'Box')}
      </InkText>
      <InkBox
        alignContent={alignContent}
        alignItems={alignItems}
        aspectRatio={aspectRatio}
        columnGap={columnGap}
        flexDirection={flexDirection}
        flexWrap={flexWrap}
        gap={gap}
        height={height}
        justifyContent={justifyContent}
        maxHeight={maxHeight}
        maxWidth={maxWidth}
        minHeight={minHeight}
        minWidth={minWidth}
        overflow={overflow}
        overflowX={overflowX}
        overflowY={overflowY}
        padding={padding}
        paddingBottom={paddingBottom}
        paddingLeft={paddingLeft}
        paddingRight={paddingRight}
        paddingTop={paddingTop}
        paddingX={paddingX}
        paddingY={paddingY}
        rowGap={rowGap}
        width={width}>
        {children}
      </InkBox>
    </InkBox>
  );
}
