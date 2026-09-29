import {
  EMPTY_MOVEMENT_FILTERS,
  matchesFilters,
  type MovementFilters,
} from './movementFilters';
import type {
  AdjustmentReason,
  MeasurementUnit,
  StockMovementSource,
  StockMovementType,
} from './stockMovement';
import type { StockMovement } from './stockMovement';

export type PendingMovementSource = Exclude<StockMovementSource, 'orderImport'>;

export type PendingMovement = {
  id: string;
  itemId: string;
  itemName: string;
  unit: MeasurementUnit;
  type: StockMovementType;
  source: PendingMovementSource;
  adjustmentReason?: AdjustmentReason;
  quantity: number;
  unitCost: number;
  occurredAt: string;
  notes: string | null;
};

export function toDisplayMovement(movement: PendingMovement): StockMovement {
  const display: StockMovement = {
    id: movement.id,
    itemId: movement.itemId,
    itemName: movement.itemName,
    unit: movement.unit,
    type: movement.type,
    source: movement.source,
    quantity: movement.quantity,
    unitCost: movement.unitCost,
    occurredAt: movement.occurredAt,
  };

  if (movement.adjustmentReason) {
    display.adjustmentReason = movement.adjustmentReason;
  }

  return display;
}

export function mergePendingMovements(
  confirmed: readonly StockMovement[],
  pending: readonly PendingMovement[],
  filters: MovementFilters = EMPTY_MOVEMENT_FILTERS,
): { movements: StockMovement[]; pendingIds: string[] } {
  const confirmedIds = new Set(confirmed.map(movement => movement.id));
  const stillPending = pending
    .map(toDisplayMovement)
    .filter(
      movement =>
        !confirmedIds.has(movement.id) && matchesFilters(movement, filters),
    );

  return {
    movements: [...confirmed, ...stillPending],
    pendingIds: stillPending.map(movement => movement.id),
  };
}

export const MAX_SYNC_BATCH_SIZE = 200;

export function toSyncBatches(
  movements: readonly PendingMovement[],
): PendingMovement[][] {
  const batches: PendingMovement[][] = [];

  for (let start = 0; start < movements.length; start += MAX_SYNC_BATCH_SIZE) {
    batches.push([...movements.slice(start, start + MAX_SYNC_BATCH_SIZE)]);
  }

  return batches;
}

export function acceptedMovementIds(result: {
  applied: readonly { id: string }[];
  duplicated: readonly string[];
}): string[] {
  return [
    ...new Set([
      ...result.applied.map(movement => movement.id),
      ...result.duplicated,
    ]),
  ];
}
