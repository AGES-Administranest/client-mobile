import { isValidExpirationDate, type ExpiringLot } from './expiryAlert';
import type { MonitoredItem } from './lowStockAlert';
import {
  backendUnitLabel,
  type BackendMeasurementUnit,
} from '../../materials/domain/materialsFilter';

type InventorySourceItem = {
  id: string;
  name: string;
  unit: BackendMeasurementUnit;
  currentQuantity: string;
  minimumStock: string | null;
  nearestExpiration: string | null;
};

export type InventoryAlertData = {
  items: MonitoredItem[];
  lots: ExpiringLot[];
};

export function inventoryAlertDataFromItems(
  source: readonly InventorySourceItem[],
): InventoryAlertData {
  const items = source.flatMap(item => {
    if (item.minimumStock === null) return [];

    return [
      {
        id: item.id,
        name: item.name,
        unit: backendUnitLabel(item.unit),
        quantity: parseFloat(item.currentQuantity),
        minimumStock: parseFloat(item.minimumStock),
      },
    ];
  });

  const lots = source.flatMap(item => {
    const expirationDate = item.nearestExpiration;
    if (!expirationDate || !isValidExpirationDate(expirationDate)) return [];

    return [
      {
        id: `nearest:${item.id}:${expirationDate}`,
        itemId: item.id,
        name: item.name,
        expirationDate: expirationDate as ExpiringLot['expirationDate'],
      },
    ];
  });

  return { items, lots };
}
