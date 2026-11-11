import { ApiError, apiClient } from 'shared/services/apiClient';

import {
  loadSupplierOutbox,
  loadSupplierRejections,
  notifyOfflineSuppliersChanged,
  saveResolvedSupplierId,
  saveSupplierOutbox,
  saveSupplierRejections,
} from './offlineSupplierStore';
import { fetchSuppliers } from './supplierService';
import {
  unmaskTaxId,
  type PendingSupplierOperation,
  type SupplierSyncRejection,
} from '../domain/offlineSuppliers';
import type { Supplier } from '../domain/supplierForm';

export type SupplierSyncResult = {
  synced: number;
  rejected: number;
  pending: number;
};

// O POST /supplier não tem chave de idempotência. Se a resposta de um envio
// anterior se perdeu, o reenvio volta DUPLICATED_SUPPLIER_TAX_ID: aí o
// fornecedor já existe com esse CNPJ e é ele que vale para o id local.
// Sem CNPJ não há como reconhecê-lo no reenvio; o POST segue como está.
async function createSupplier(
  idToken: string,
  operation: Extract<PendingSupplierOperation, { kind: 'create' }>,
): Promise<string> {
  // `active` não existe no CreateSupplierDto; todo fornecedor nasce ativo.
  const { active, ...body } = operation.payload;
  let id: string;
  try {
    id = (await apiClient.post<Supplier>('/supplier', body, { token: idToken }))
      .id;
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.code !== 'DUPLICATED_SUPPLIER_TAX_ID' ||
      !body.taxId
    ) {
      throw error;
    }
    const wanted = unmaskTaxId(body.taxId);
    const existing = (await fetchSuppliers(idToken)).find(
      supplier => unmaskTaxId(supplier.taxId ?? '') === wanted,
    );
    if (!existing) throw error;
    id = existing.id;
  }
  // Criado offline e desativado antes de sincronizar: só um PATCH desativa.
  if (active === false) {
    await apiClient.patch(`/supplier/${id}`, { active }, { token: idToken });
  }
  return id;
}

async function send(
  idToken: string,
  userId: string,
  operation: PendingSupplierOperation,
): Promise<void> {
  if (operation.kind === 'create') {
    const supplierId = await createSupplier(idToken, operation);
    await saveResolvedSupplierId(userId, operation.localId, supplierId);
    return;
  }
  await apiClient.patch(
    `/supplier/${operation.supplierId}`,
    operation.changes,
    {
      token: idToken,
    },
  );
}

// Mesma regra das outras filas: só um 4xx de dado é definitivo.
function isPermanentRejection(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    ![401, 403, 408, 429].includes(error.status)
  );
}

async function removeIfUnchanged(
  userId: string,
  sent: PendingSupplierOperation,
): Promise<void> {
  const queue = await loadSupplierOutbox(userId);
  const sentJson = JSON.stringify(sent);
  const index = queue.findIndex(
    operation => JSON.stringify(operation) === sentJson,
  );
  if (index !== -1) {
    await saveSupplierOutbox(userId, [
      ...queue.slice(0, index),
      ...queue.slice(index + 1),
    ]);
  }
}

async function run(
  idToken: string,
  userId: string,
): Promise<SupplierSyncResult> {
  let synced = 0;
  const rejections: SupplierSyncRejection[] = [];
  const attempted = new Set<string>();

  for (;;) {
    const queue = await loadSupplierOutbox(userId);
    const next = queue.find(
      operation => !attempted.has(JSON.stringify(operation)),
    );
    if (!next) break;
    attempted.add(JSON.stringify(next));

    try {
      await send(idToken, userId, next);
      synced += 1;
    } catch (error) {
      if (!isPermanentRejection(error)) break;
      rejections.push({ operation: next, code: error.code });
    }
    await removeIfUnchanged(userId, next);
  }

  if (rejections.length > 0) {
    await saveSupplierRejections(userId, [
      ...(await loadSupplierRejections(userId)),
      ...rejections,
    ]);
  }
  if (synced > 0 || rejections.length > 0) {
    notifyOfflineSuppliersChanged();
  }

  return {
    synced,
    rejected: rejections.length,
    pending: (await loadSupplierOutbox(userId)).length,
  };
}

let running: Promise<SupplierSyncResult> | null = null;

/** Envia os fornecedores da fila em ordem. */
export function syncPendingSuppliers(
  idToken: string,
  userId: string,
): Promise<SupplierSyncResult> {
  if (!running) {
    running = run(idToken, userId).finally(() => {
      running = null;
    });
  }
  return running;
}
