import { useEffect, useState } from 'react';

import type { StockItem } from '../domain/stockItem';
import { fetchStockItems } from '../services/stockItemService';

// Owns the list on the Materials screen and which item is open for editing.
// Edits and deletes come back through the sheet's callbacks and are applied
// to the local list, so the screen updates without refetching.
export function useStockItems() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchStockItems().then(loaded => {
      if (isMounted) {
        setItems(loaded);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedItem = items.find(item => item.id === selectedId) ?? null;

  const open = (item: StockItem) => setSelectedId(item.id);
  const close = () => setSelectedId(null);

  const applySaved = (saved: StockItem) => {
    setItems(current =>
      current.map(item => (item.id === saved.id ? saved : item)),
    );
    setSelectedId(null);
  };

  const applyDeleted = (id: string) => {
    setItems(current => current.filter(item => item.id !== id));
    setSelectedId(null);
  };

  return {
    items,
    isLoading,
    selectedItem,
    open,
    close,
    applySaved,
    applyDeleted,
  };
}
