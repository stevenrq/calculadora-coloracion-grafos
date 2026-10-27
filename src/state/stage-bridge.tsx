import { createContext, type ReactNode, use, useState } from 'react';

import type { StageBridge } from '@/lib/precedence/bridge';

interface StageBridgeValue {
  /** Último puente abierto desde Precedencias; Colorear lo usa solo mientras su grafo siga siendo ese. */
  bridge: StageBridge | null;
  showBridge(bridge: StageBridge): void;
  dismissBridge(): void;
}

const StageBridgeContext = createContext<StageBridgeValue | null>(null);

/** No se guarda: al reabrir la app, Colorear muestra el grafo sin la comparación. */
export function StageBridgeProvider({ children }: { children: ReactNode }) {
  const [bridge, setBridge] = useState<StageBridge | null>(null);
  return (
    <StageBridgeContext value={{ bridge, showBridge: setBridge, dismissBridge: () => setBridge(null) }}>
      {children}
    </StageBridgeContext>
  );
}

export function useStageBridge(): StageBridgeValue {
  const value = use(StageBridgeContext);
  if (!value) throw new Error('useStageBridge debe usarse dentro de <StageBridgeProvider>');
  return value;
}
