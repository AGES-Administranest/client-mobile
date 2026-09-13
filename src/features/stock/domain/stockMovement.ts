export type StockMovementType = 'inbound' | 'outbound';

export type StockMovementSource =
  | 'manualPurchase'
  | 'orderImport'
  | 'appointment'
  | 'manualAdjustment'
  | 'correctionReversal';

export type AdjustmentReason = 'loss' | 'expiration' | 'breakage' | 'other';

export type MeasurementUnit =
  | 'unit'
  | 'ampoule'
  | 'vial'
  | 'box'
  | 'ml'
  | 'mg'
  | 'tablet'
  | 'other';

export type MovementAppointment = {
  id: string;
  label: string;
};

export type StockMovement = {
  id: string;
  itemName: string;
  unit: MeasurementUnit;
  type: StockMovementType;
  source: StockMovementSource;
  quantity: number;
  unitCost: number;
  occurredAt: string;
  adjustmentReason?: AdjustmentReason;
  appointment?: MovementAppointment;
};

export type MovementOriginKey =
  | 'manualPurchase'
  | 'orderImport'
  | 'appointment'
  | 'correctionReversal'
  | 'adjustmentLoss'
  | 'adjustmentExpiration'
  | 'adjustmentBreakage'
  | 'adjustmentOther';

const ADJUSTMENT_ORIGINS: Record<AdjustmentReason, MovementOriginKey> = {
  loss: 'adjustmentLoss',
  expiration: 'adjustmentExpiration',
  breakage: 'adjustmentBreakage',
  other: 'adjustmentOther',
};

export function getMovementOriginKey(
  movement: StockMovement,
): MovementOriginKey {
  if (movement.source !== 'manualAdjustment') {
    return movement.source;
  }

  return ADJUSTMENT_ORIGINS[movement.adjustmentReason ?? 'other'];
}

export function getSignedQuantity(movement: StockMovement): number {
  return movement.type === 'inbound' ? movement.quantity : -movement.quantity;
}

export function getSignedTotal(movement: StockMovement): number {
  return getSignedQuantity(movement) * movement.unitCost;
}

export type UnitPluralForm = 'one' | 'other';

export function getUnitPluralForm(movement: StockMovement): UnitPluralForm {
  return Math.abs(movement.quantity) === 1 ? 'one' : 'other';
}

export function getMovementAppointment(
  movement: StockMovement,
): MovementAppointment | null {
  if (movement.source !== 'appointment') {
    return null;
  }

  return movement.appointment ?? null;
}

export function sortMovementsByDate(
  movements: readonly StockMovement[],
): StockMovement[] {
  return [...movements].sort((a, b) => {
    const difference =
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();

    return difference !== 0 ? difference : a.id.localeCompare(b.id);
  });
}
