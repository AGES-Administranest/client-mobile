import { apiClient } from 'shared/services/apiClient';

import {
  toAdjustmentReason,
  toMeasurementUnit,
  toMovementSource,
  toMovementType,
  type BackendAdjustmentReason,
  type BackendMeasurementUnit,
  type BackendMovementSource,
  type BackendMovementType,
} from './backendEnums';
import type { MovementQuery } from '../domain/movementFilters';
import type { StockMovement } from '../domain/stockMovement';

type BackendAppointment = {
  id: string;
  label: string;
  procedureName: string;
  patientName: string;
};

export type BackendStockMovement = {
  id: string;
  itemId: string;
  itemName: string;
  unit: BackendMeasurementUnit;
  type: BackendMovementType;
  source: BackendMovementSource;
  adjustmentReason: BackendAdjustmentReason | null;
  quantity: string;
  unitCost: string;
  occurredAt: string;
  appointmentId: string | null;
  purchaseOrderId: string | null;
  lotId: string | null;
  supplierId: string | null;
  appointment: BackendAppointment | null;
  notes: string | null;
};

const MAX_PAGE_SIZE = 100;

export function toStockMovement(movement: BackendStockMovement): StockMovement {
  const source = toMovementSource(movement.source);

  const mapped: StockMovement = {
    id: movement.id,
    itemId: movement.itemId,
    itemName: movement.itemName,
    unit: toMeasurementUnit(movement.unit),
    type: toMovementType(movement.type),
    source,
    quantity: Number(movement.quantity),
    unitCost: Number(movement.unitCost),
    occurredAt: movement.occurredAt,
  };

  if (movement.adjustmentReason) {
    mapped.adjustmentReason = toAdjustmentReason(movement.adjustmentReason);
  }

  if (source === 'appointment' && movement.appointment) {
    mapped.appointment = {
      id: movement.appointment.id,
      label: movement.appointment.label,
    };
  }

  return mapped;
}

export async function fetchStockMovements(
  idToken: string,
  filters: MovementQuery = {},
): Promise<StockMovement[]> {
  const query = new URLSearchParams({
    page: String(filters.page ?? 1),
    limit: String(MAX_PAGE_SIZE),
  });

  if (filters.search) {
    query.set('search', filters.search);
  }

  if (filters.periodStart) {
    query.set('periodStart', filters.periodStart);
  }

  if (filters.periodEnd) {
    query.set('periodEnd', filters.periodEnd);
  }

  const movements = await apiClient.get<BackendStockMovement[]>(
    `/stock-movement?${query.toString()}`,
    { token: idToken },
  );

  return movements.map(toStockMovement);
}
