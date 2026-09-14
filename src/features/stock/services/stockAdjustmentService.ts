import type { AdjustmentReason } from '../domain/outputAdjustment';
import type { MeasurementUnit } from '../domain/stockMovement';

export type AdjustableItem = {
  id: string;
  name: string;
  unit: MeasurementUnit;
  availableQuantity: number;
};

export type OutputAdjustmentInput = {
  itemId: string;
  quantity: number;
  reason: AdjustmentReason;
  notes: string | null;
};

export class StockAdjustmentError extends Error {
  constructor(
    message: string,
    readonly code: 'INSUFFICIENT_STOCK' | 'ITEM_NOT_FOUND',
    readonly params: Record<string, string | number> = {},
  ) {
    super(message);
    this.name = 'StockAdjustmentError';
  }
}

const ITEMS: AdjustableItem[] = [
  {
    id: 'item-1',
    name: 'Propofol 10mg/ml 20ml',
    unit: 'ampoule',
    availableQuantity: 8,
  },
  {
    id: 'item-2',
    name: 'Seringa 60ml (cx 30un)',
    unit: 'box',
    availableQuantity: 4,
  },
  {
    id: 'item-3',
    name: 'Midazolam 5mg/ml',
    unit: 'ampoule',
    availableQuantity: 12,
  },
  {
    id: 'item-4',
    name: 'Isoflurano 100ml',
    unit: 'vial',
    availableQuantity: 5,
  },
  {
    id: 'item-5',
    name: 'Soro fisiológico 500ml',
    unit: 'unit',
    availableQuantity: 20,
  },
  {
    id: 'item-6',
    name: 'Cetamina 50mg/ml',
    unit: 'ampoule',
    availableQuantity: 3,
  },
  {
    id: 'item-7',
    name: 'Gaze estéril',
    unit: 'box',
    availableQuantity: 6,
  },
];

export async function fetchAdjustableItems(): Promise<AdjustableItem[]> {
  return Promise.resolve(ITEMS);
}

export async function createOutputAdjustment(
  input: OutputAdjustmentInput,
): Promise<void> {
  const item = ITEMS.find(candidate => candidate.id === input.itemId);

  if (!item) {
    throw new StockAdjustmentError('Item not found', 'ITEM_NOT_FOUND');
  }

  if (input.quantity > item.availableQuantity) {
    throw new StockAdjustmentError('Insufficient stock', 'INSUFFICIENT_STOCK', {
      available: item.availableQuantity,
    });
  }

  return Promise.resolve();
}
