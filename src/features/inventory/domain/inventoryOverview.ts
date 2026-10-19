import { isExpiringSoon, type ExpiringLot } from './expiryAlert';
import { isAtOrBelowMinimum, type MonitoredItem } from './lowStockAlert';

export type InventoryDisplayItem = MonitoredItem & {
  category: string;
  price: number;
};

export function inventoryAlertState(
  item: MonitoredItem,
  lots: readonly ExpiringLot[],
  now: Date,
) {
  return {
    lowStock: isAtOrBelowMinimum(item),
    expiringLots: lots.filter(
      lot => lot.itemId === item.id && isExpiringSoon(lot, now),
    ),
  };
}

export function inventorySummary(
  items: readonly MonitoredItem[],
  lots: readonly ExpiringLot[],
  now: Date,
) {
  return {
    lowStockCount: items.filter(isAtOrBelowMinimum).length,
    expiringLotCount: lots.filter(lot => isExpiringSoon(lot, now)).length,
  };
}
