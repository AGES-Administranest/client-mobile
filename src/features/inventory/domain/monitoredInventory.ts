import {
  isValidExpirationDate,
  type ExpiringLot,
  type IsoDate,
} from './expiryAlert';
import type { MonitoredItem } from './lowStockAlert';

export type InventoryItemSnapshot = {
  id: string;
  name: string;
  unit: string;
  currentQuantity: string;
  minimumStock: string | null;
  nearestExpiration: string | null;
};

export function toMonitoredItems(
  items: readonly InventoryItemSnapshot[],
  unitLabel: (unit: string) => string,
): MonitoredItem[] {
  return items.map(item => ({
    id: item.id,
    name: item.name,
    unit: unitLabel(item.unit),
    quantity: Number(item.currentQuantity),
    minimumStock: item.minimumStock ? Number(item.minimumStock) : 0,
  }));
}

// ponytail: the backend only exposes each item's nearest lot
// (`nearestExpiration`), not the full lot list — an item with more than
// one lot expiring soon only shows the closest one. Add when a
// lot-listing endpoint exists.
export function toExpiringLots(
  items: readonly InventoryItemSnapshot[],
): ExpiringLot[] {
  return items
    .filter(
      (item): item is InventoryItemSnapshot & { nearestExpiration: string } =>
        item.nearestExpiration !== null &&
        isValidExpirationDate(item.nearestExpiration),
    )
    .map(item => ({
      id: item.id,
      itemId: item.id,
      name: item.name,
      expirationDate: item.nearestExpiration as IsoDate,
    }));
}
