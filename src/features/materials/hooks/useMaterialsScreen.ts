import { useCallback, useEffect, useMemo, useState } from 'react';

import type { StockItem } from 'app/components/ui/item-modal/domain/itemModal';
import type { ItemDraft } from 'app/components/ui/item-modal/item-modal';
import type { SegmentValue } from 'app/components/ui/segmented-control';
import { sessionStore } from 'shared/services/sessionStore';

import {
  ALL_CATEGORIES,
  backendItemToMaterial,
  backendUnitLabel,
  filterMaterials,
  getCategoriesForSegment,
  toBackendUnit,
  type BackendItem,
  type BackendItemCategory,
  type MaterialItem,
} from '../domain/materialsFilter';
import { createItemLot } from '../services/itemLotService';
import { createItem, deleteItem, fetchItems } from '../services/itemService';

type MaterialsScreenState = {
  segment: SegmentValue;
  onSegmentChange: (segment: SegmentValue) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  items: MaterialItem[];
  isLoading: boolean;
  error: string | null;
  onConfirmAdd: (draft: ItemDraft) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  getStockItem: (id: string) => StockItem | null;
};

function parseCurrency(formatted: string): number {
  const normalised = formatted.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalised) || 0;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseExpirationDate(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10);
}


function backendItemToStockItem(item: BackendItem): StockItem {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    unitCost: item.defaultUnitCost ? parseFloat(item.defaultUnitCost) : 0,
    unit: backendUnitLabel(item.unit),
    quantity: parseFloat(item.currentQuantity),
    minQuantity: item.minimumStock ? parseFloat(item.minimumStock) : 0,
    expiration: null,
  };
}

export function useMaterialsScreen(): MaterialsScreenState {
  const [segment, setSegment] = useState<SegmentValue>('supplies');
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [allBackendItems, setAllBackendItems] = useState<BackendItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allItems = useMemo(
    () => allBackendItems.map(backendItemToMaterial),
    [allBackendItems],
  );

  function onSegmentChange(nextSegment: SegmentValue) {
    setSegment(nextSegment);
    setCategory(ALL_CATEGORIES);
  }

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    fetchItems()
      .then(backendItems => {
        if (!isMounted) return;
        setAllBackendItems(backendItems);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('materials.errorLoad');
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  
  const onConfirmAdd = useCallback(async (draft: ItemDraft) => {
    const session = sessionStore.get();
    const userId = session?.userId ?? '';
    const quantity = parseFloat(draft.quantity) || 0;
    const unitCost = parseCurrency(draft.unitCost);
    const expirationDate = parseExpirationDate(draft.expiration);
    const receivedOn = todayIso();

    let targetItemId = draft.selectedItemId;

    if (!targetItemId) {
      
      const minimumStock =
        draft.minQuantity !== null
          ? parseFloat(draft.minQuantity) || 0
          : undefined;

      const newItem = await createItem({
        userId,
        category: draft.category as BackendItemCategory,
        unit: toBackendUnit(draft.unit),
        name: draft.name,
        defaultUnitCost: unitCost || undefined,
        minimumStock,
      });

      targetItemId = newItem.id;

      
      setAllBackendItems(prev => [...prev, newItem]);
    }

    await createItemLot(targetItemId, {
      userId,
      quantity,
      unitCost,
      expirationDate,
      receivedOn,
    });

    
    const refreshed = await fetchItems();
    setAllBackendItems(refreshed);
  }, []);

  const onDeleteItem = useCallback(async (id: string) => {
    await deleteItem(id);
    setAllBackendItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const getStockItem = useCallback(
    (id: string): StockItem | null => {
      const backendItem = allBackendItems.find(item => item.id === id);
      return backendItem ? backendItemToStockItem(backendItem) : null;
    },
    [allBackendItems],
  );

  const categories = getCategoriesForSegment(allItems, segment);
  const items = filterMaterials(allItems, segment, category);

  return {
    segment,
    onSegmentChange,
    category,
    onCategoryChange: setCategory,
    categories,
    items,
    isLoading,
    error,
    onConfirmAdd,
    onDeleteItem,
    getStockItem,
  };
}
