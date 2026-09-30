import { apiClient } from 'shared/services/apiClient';

import {
  fromAdjustmentReason,
  fromMovementSource,
  fromMovementType,
} from './backendEnums';
import {
  toStockMovement,
  type BackendStockMovement,
} from './stockMovementService';
import type { PendingMovement } from '../domain/pendingMovement';
import type { StockMovement } from '../domain/stockMovement';

export const SYNC_EPOCH = '1970-01-01T00:00:00.000Z';

type BackendBalance = {
  itemId: string;
  itemName: string;
  currentQuantity: string;
  needsAdjustment: boolean;
};

export type ItemBalance = {
  itemId: string;
  itemName: string;
  currentQuantity: number;
  needsAdjustment: boolean;
};

export type PushResult = {
  applied: StockMovement[];
  duplicated: string[];
  balances: ItemBalance[];
  needsAdjustment: string[];
};

export type PullResult = {
  movements: StockMovement[];
  balances: ItemBalance[];
  cursor: string;
  hasMore: boolean;
  afterId: string | null;
};

function toItemBalance(balance: BackendBalance): ItemBalance {
  return {
    itemId: balance.itemId,
    itemName: balance.itemName,
    currentQuantity: Number(balance.currentQuantity),
    needsAdjustment: balance.needsAdjustment,
  };
}

function toSyncPayload(movement: PendingMovement) {
  return {
    id: movement.id,
    itemId: movement.itemId,
    type: fromMovementType(movement.type),
    source: fromMovementSource(movement.source),
    adjustmentReason: movement.adjustmentReason
      ? fromAdjustmentReason(movement.adjustmentReason)
      : null,
    quantity: movement.quantity,
    unitCost: movement.unitCost,
    occurredAt: movement.occurredAt,
    notes: movement.notes,
  };
}

export async function pushPendingMovements(
  idToken: string,
  movements: readonly PendingMovement[],
): Promise<PushResult> {
  const response = await apiClient.post<{
    applied: BackendStockMovement[];
    duplicated: string[];
    balances: BackendBalance[];
    needsAdjustment: string[];
  }>(
    '/stock-movement/sync',
    { movements: movements.map(toSyncPayload) },
    { token: idToken },
  );

  return {
    applied: response.applied.map(toStockMovement),
    duplicated: response.duplicated,
    balances: response.balances.map(toItemBalance),
    needsAdjustment: response.needsAdjustment,
  };
}

// `afterId` continua uma página cheia exatamente de onde ela parou. Sem ele o
// servidor recua uma janela de segurança a partir de `since` e, se a página
// inteira couber nessa janela, devolve a mesma página para sempre.
export async function pullStockMovements(
  idToken: string,
  since: string,
  afterId: string | null = null,
): Promise<PullResult> {
  const query = new URLSearchParams({ since });

  if (afterId) {
    query.set('afterId', afterId);
  }

  const response = await apiClient.get<{
    movements: BackendStockMovement[];
    balances: BackendBalance[];
    cursor: string;
    hasMore: boolean;
    afterId: string | null;
  }>(`/stock-movement/sync?${query.toString()}`, { token: idToken });

  return {
    movements: response.movements.map(toStockMovement),
    balances: response.balances.map(toItemBalance),
    cursor: response.cursor,
    hasMore: response.hasMore,
    afterId: response.hasMore ? response.afterId : null,
  };
}
