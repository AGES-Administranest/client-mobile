export type SupplySource = 'stock' | 'standalone';

export type SupplyItem = {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  source: SupplySource;
};

export function getSupplyLineCost(item: SupplyItem): number {
  return item.quantity * item.unitCost;
}

export function calculateSupplyTotalCost(items: readonly SupplyItem[]): number {
  return items.reduce((total, item) => total + getSupplyLineCost(item), 0);
}

// The list is keyed by id, so adding an item that is already there sums the
// quantities instead of rendering a second row with the same key.
export function addSupplyItem(
  items: readonly SupplyItem[],
  item: SupplyItem,
): SupplyItem[] {
  const existing = items.find(current => current.id === item.id);

  if (!existing) {
    return [...items, item];
  }

  return items.map(current =>
    current.id === item.id
      ? { ...current, quantity: current.quantity + item.quantity }
      : current,
  );
}

export function removeSupplyItem(
  items: readonly SupplyItem[],
  id: string,
): SupplyItem[] {
  return items.filter(item => item.id !== id);
}

export function updateSupplyQuantity(
  items: readonly SupplyItem[],
  id: string,
  quantity: number,
): SupplyItem[] {
  return items.map(item => (item.id === id ? { ...item, quantity } : item));
}
