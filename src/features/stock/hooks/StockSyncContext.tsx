import { createContext, useContext, type ReactNode } from 'react';

import { useStockSync, type StockSyncState } from './useStockSync';

const StockSyncContext = createContext<StockSyncState | undefined>(undefined);

export function StockSyncProvider({ children }: { children: ReactNode }) {
  const sync = useStockSync();

  return (
    <StockSyncContext.Provider value={sync}>
      {children}
    </StockSyncContext.Provider>
  );
}

export function useStockSyncState(): StockSyncState {
  const context = useContext(StockSyncContext);

  if (!context) {
    throw new Error(
      'useStockSyncState must be used within a StockSyncProvider.',
    );
  }

  return context;
}
