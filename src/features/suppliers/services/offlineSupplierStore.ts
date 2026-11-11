import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { isNetworkError } from 'shared/utils/network';

import {
  applyPendingSupplierOperations,
  enqueueSupplierUpdate,
  hasSupplierWithTaxId,
  isLocalSupplierId,
  localSupplierId,
  pendingCreateToSupplier,
  type OfflineSupplierPayload,
  type PendingSupplierOperation,
  type SupplierSyncRejection,
} from '../domain/offlineSuppliers';
import type { Supplier } from '../domain/supplierForm';

// Por usuário, como a fila das clínicas: quem entra depois no mesmo aparelho
// não vê os fornecedores nem a fila de quem saiu.
const PREFIX = '@administranest:suppliers';
const listKey = (userId: string) => `${PREFIX}:${userId}:list`;
const outboxKey = (userId: string) => `${PREFIX}:${userId}:outbox`;
const rejectionsKey = (userId: string) => `${PREFIX}:${userId}:rejections`;
const resolvedKey = (userId: string) => `${PREFIX}:${userId}:resolved`;

type Listener = () => void;
const listeners = new Set<Listener>();

/** Avisa quem mostra fornecedores de que a fila ou a lista salva mudaram. */
export function subscribeOfflineSuppliers(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyOfflineSuppliersChanged(): void {
  listeners.forEach(listener => listener());
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function loadSupplierOutbox(
  userId: string,
): Promise<PendingSupplierOperation[]> {
  return readJson<PendingSupplierOperation[]>(outboxKey(userId), []);
}

export async function saveSupplierOutbox(
  userId: string,
  queue: PendingSupplierOperation[],
): Promise<void> {
  await writeJson(outboxKey(userId), queue);
}

export function loadSupplierRejections(
  userId: string,
): Promise<SupplierSyncRejection[]> {
  return readJson<SupplierSyncRejection[]>(rejectionsKey(userId), []);
}

export async function saveSupplierRejections(
  userId: string,
  rejections: SupplierSyncRejection[],
): Promise<void> {
  await writeJson(rejectionsKey(userId), rejections);
}

/** Id local → id do backend, dos fornecedores criados offline já enviados. */
export function loadResolvedSupplierIds(
  userId: string,
): Promise<Record<string, string>> {
  return readJson<Record<string, string>>(resolvedKey(userId), {});
}

export async function saveResolvedSupplierId(
  userId: string,
  localId: string,
  supplierId: string,
): Promise<void> {
  const resolved = await loadResolvedSupplierIds(userId);
  await writeJson(resolvedKey(userId), { ...resolved, [localId]: supplierId });
}

async function loadSupplierCache(userId: string): Promise<Supplier[] | null> {
  return readJson<Supplier[] | null>(listKey(userId), null);
}

async function saveSupplierCache(
  userId: string,
  suppliers: Supplier[],
): Promise<void> {
  try {
    await writeJson(listKey(userId), suppliers);
  } catch {
    // Sem cache a lista só não abre offline; online continua igual.
  }
}

export type LoadedSuppliers = { suppliers: Supplier[]; isOffline: boolean };

/**
 * Com rede, a lista vem do backend e fica salva; sem rede, vem do que foi
 * salvo da última vez. Nos dois casos o que foi cadastrado ou editado offline
 * entra por cima.
 */
export async function loadSuppliersWithOffline(
  userId: string | null,
  fetcher: () => Promise<Supplier[]>,
): Promise<LoadedSuppliers> {
  let suppliers: Supplier[];
  let isOffline = false;
  try {
    suppliers = await fetcher();
    if (userId) await saveSupplierCache(userId, suppliers);
  } catch (error) {
    if (!userId || !isNetworkError(error)) throw error;
    const cached = await loadSupplierCache(userId);
    const queue = await loadSupplierOutbox(userId);
    if (cached === null && queue.length === 0) throw error;
    suppliers = cached ?? [];
    isOffline = true;
  }
  const queue = userId ? await loadSupplierOutbox(userId) : [];
  return {
    suppliers: applyPendingSupplierOperations(suppliers, queue),
    isOffline,
  };
}

async function offlineSuppliers(userId: string): Promise<Supplier[]> {
  return applyPendingSupplierOperations(
    (await loadSupplierCache(userId)) ?? [],
    await loadSupplierOutbox(userId),
  );
}

/**
 * O CNPJ é único no backend; sem rede, a mesma checagem roda contra a lista
 * salva e a fila, para não aceitar agora o que seria recusado no envio.
 */
export async function hasOfflineSupplierTaxId(
  userId: string,
  taxId: string,
  exceptId?: string,
): Promise<boolean> {
  return hasSupplierWithTaxId(await offlineSuppliers(userId), taxId, exceptId);
}

export async function queueSupplierCreate(
  userId: string,
  payload: OfflineSupplierPayload,
): Promise<Supplier> {
  const localId = localSupplierId(Crypto.randomUUID());
  const queue = await loadSupplierOutbox(userId);
  await saveSupplierOutbox(userId, [
    ...queue,
    { kind: 'create', localId, payload },
  ]);
  notifyOfflineSuppliersChanged();
  return pendingCreateToSupplier(localId, payload);
}

export async function queueSupplierUpdate(
  userId: string,
  supplierId: string,
  changes: Partial<OfflineSupplierPayload>,
): Promise<Supplier | null> {
  // A tela pode ainda mostrar o id local de um fornecedor que já sincronizou;
  // a edição vai para o id real, senão cairia num create que não existe mais.
  const resolved = isLocalSupplierId(supplierId)
    ? (await loadResolvedSupplierIds(userId))[supplierId]
    : undefined;
  const targetId = resolved ?? supplierId;
  const queue = await loadSupplierOutbox(userId);
  await saveSupplierOutbox(
    userId,
    enqueueSupplierUpdate(queue, targetId, changes),
  );
  notifyOfflineSuppliersChanged();
  return (
    (await offlineSuppliers(userId)).find(
      supplier => supplier.id === targetId,
    ) ?? null
  );
}
