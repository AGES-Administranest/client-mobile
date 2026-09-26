import { useCallback, useMemo, useState } from 'react';

import {
  addSupplyItem,
  calculateSupplyTotalCost,
  removeSupplyItem,
  updateSupplyQuantity,
  type SupplyItem,
} from '../domain/supplyItem';

export type SupplyListState = {
  items: SupplyItem[];
  totalCost: number;
  addItem: (item: SupplyItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
};

export function useSupplyList(
  initialItems: readonly SupplyItem[] = [],
): SupplyListState {
  const [items, setItems] = useState<SupplyItem[]>(() => [...initialItems]);

  const addItem = useCallback(
    (item: SupplyItem) => setItems(current => addSupplyItem(current, item)),
    [],
  );

  const removeItem = useCallback(
    (id: string) => setItems(current => removeSupplyItem(current, id)),
    [],
  );

  const updateQuantity = useCallback(
    (id: string, quantity: number) =>
      setItems(current => updateSupplyQuantity(current, id, quantity)),
    [],
  );

  const totalCost = useMemo(() => calculateSupplyTotalCost(items), [items]);

  return { items, totalCost, addItem, removeItem, updateQuantity };
}
