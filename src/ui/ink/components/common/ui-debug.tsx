import { createContext, type ReactNode, useContext } from 'react';

const UiDebugContext = createContext(false);

interface UiDebugProviderProps {
  children: ReactNode;
  enabled: boolean;
}

export function UiDebugProvider({ children, enabled }: UiDebugProviderProps) {
  return <UiDebugContext.Provider value={enabled}>{children}</UiDebugContext.Provider>;
}

export function useUiDebug(): boolean {
  return useContext(UiDebugContext);
}
