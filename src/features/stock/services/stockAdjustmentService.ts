import { fetchItems, type BackendItem } from 'features/materials';

import { toMeasurementUnit } from './backendEnums';
import type { MeasurementUnit } from '../domain/stockMovement';

export type AdjustableItem = {
  id: string;
  name: string;
  unit: MeasurementUnit;
  availableQuantity: number;
  unitCost: number;
};

function toAdjustableItem(item: BackendItem): AdjustableItem {
  return {
    id: item.id,
    name: item.name,
    unit: toMeasurementUnit(item.unit),
    availableQuantity: Number(item.currentQuantity),
    unitCost: item.defaultUnitCost ? Number(item.defaultUnitCost) : 0,
  };
}

export async function fetchAdjustableItems(
  idToken: string,
): Promise<AdjustableItem[]> {
  const items = await fetchItems(idToken);

  return items.map(toAdjustableItem);
}
