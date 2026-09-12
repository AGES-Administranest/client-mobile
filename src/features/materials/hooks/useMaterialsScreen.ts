import { useCallback, useEffect, useMemo, useState } from 'react';

import type { StockItem } from 'app/components/ui/item-modal/domain/itemModal';
import type { ItemDraft } from 'app/components/ui/item-modal/item-modal';
import type { SegmentValue } from 'app/components/ui/segmented-control';

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
import {
  createItem,
  deleteItem,
  fetchItems,
  updateItem,
} from '../services/itemService';

type MaterialsScreenState = {
  segment: SegmentValue;
  onSegmentChange: (segment: SegmentValue) => void;
  category: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  items: MaterialItem[];
  stockItems: StockItem[];
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

// O formulário entrega a validade como DD/MM/AAAA. `new Date('31/03/2027')` é
// Invalid Date, então a validade digitada era descartada em silêncio e nunca
// chegava ao backend; aqui ela é convertida para o ISO que o lote espera.
function parseExpirationDate(value: string): string | undefined {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) return undefined;

  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  const isRealDate =
    parsed.getFullYear() === Number(year) &&
    parsed.getMonth() === Number(month) - 1 &&
    parsed.getDate() === Number(day);

  return isRealDate ? `${year}-${month}-${day}` : undefined;
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

  // Alimenta a busca por nome do modal de cadastro.
  const stockItems = useMemo(
    () => allBackendItems.map(backendItemToStockItem),
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
    const quantity = parseFloat(draft.quantity) || 0;
    const unitCost = parseCurrency(draft.unitCost);
    const expirationDate = parseExpirationDate(draft.expiration);
    const receivedOn = todayIso();
    const minimumStock =
      draft.minQuantity !== null
        ? parseFloat(draft.minQuantity) || 0
        : undefined;

    // Editar mexe nos atributos do item (PATCH /item/:id). O saldo não vai
    // aqui: currentQuantity é um cache das stock_movement no backend, e o
    // modal de edição já vem preenchido com o saldo atual — mandá-lo como
    // lote dobraria o estoque.
    if (draft.editingItemId) {
      const updated = await updateItem(draft.editingItemId, {
        name: draft.name,
        category: draft.category as BackendItemCategory,
        unit: toBackendUnit(draft.unit),
        defaultUnitCost: unitCost || undefined,
        minimumStock,
      });
      setAllBackendItems(prev =>
        prev.map(item => (item.id === updated.id ? updated : item)),
      );
      return;
    }

    let targetItemId = draft.selectedItemId;

    if (!targetItemId) {
      const newItem = await createItem({
        category: draft.category as BackendItemCategory,
        unit: toBackendUnit(draft.unit),
        name: draft.name,
        defaultUnitCost: unitCost || undefined,
        minimumStock,
      });

      targetItemId = newItem.id;

      setAllBackendItems(prev => [...prev, newItem]);
    }

    // CreateItemLotDto exige @IsPositive() em quantity: cadastrar um item sem
    // estoque inicial não pode abrir lote nenhum, senão volta 400.
    if (quantity > 0) {
      await createItemLot(targetItemId, {
        quantity,
        unitCost,
        expirationDate,
        receivedOn,
      });
    }

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
    stockItems,
    isLoading,
    error,
    onConfirmAdd,
    onDeleteItem,
    getStockItem,
  };
}
