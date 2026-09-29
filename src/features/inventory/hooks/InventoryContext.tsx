import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { useAuth } from 'features/auth';
import { backendUnitLabel, fetchItems } from 'features/materials';

import type { ExpiringLot } from '../domain/expiryAlert';
import type { MonitoredItem } from '../domain/lowStockAlert';
import { toExpiringLots, toMonitoredItems } from '../domain/monitoredInventory';

type InventoryStatus = 'loading' | 'ready' | 'error';

type InventoryContextValue = {
  status: InventoryStatus;
  items: MonitoredItem[];
  lots: ExpiringLot[];
  refresh: () => void;
};

const InventoryContext = createContext<InventoryContextValue | undefined>(
  undefined,
);

type InventoryProviderProps = {
  children: ReactNode;
};

export function InventoryProvider({ children }: InventoryProviderProps) {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [status, setStatus] = useState<InventoryStatus>('loading');
  const [items, setItems] = useState<MonitoredItem[]>([]);
  const [lots, setLots] = useState<ExpiringLot[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;

    if (!idToken) {
      setStatus('loading');
      setItems([]);
      setLots([]);
      return;
    }

    setStatus('loading');

    fetchItems(idToken)
      .then(backendItems => {
        if (!isMounted) return;
        setItems(toMonitoredItems(backendItems, backendUnitLabel));
        setLots(toExpiringLots(backendItems));
        setStatus('ready');
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, [idToken, attempt]);

  const refresh = useCallback(() => setAttempt(current => current + 1), []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refresh();
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  const value = useMemo(
    () => ({ status, items, lots, refresh }),
    [status, items, lots, refresh],
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory(): InventoryContextValue {
  const context = useContext(InventoryContext);

  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider.');
  }

  return context;
}
