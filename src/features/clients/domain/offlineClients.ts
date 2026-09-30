import type { Client, ClientType, TaxIdType } from './client';
import { normalizeForSearch } from './clientSearch';

/** O corpo de um POST /client, como o formulário de clínica monta. */
export type OfflineClientPayload = {
  type: ClientType;
  name: string;
  taxId?: string;
  taxIdType?: TaxIdType;
  contactName?: string;
  email?: string;
  phone?: string;
  addressLine?: string;
  city?: string;
  state?: string;
};

export type OfflineClientChanges = Partial<OfflineClientPayload>;

export type PendingClientOperation =
  | { kind: 'create'; localId: string; payload: OfflineClientPayload }
  | { kind: 'update'; clientId: string; changes: OfflineClientChanges };

export type ClientSyncRejection = {
  operation: PendingClientOperation;
  code: string | null;
};

/** Onde está um id de clínica que um agendamento offline referencia. */
export type LocalClientResolution =
  | { status: 'resolved'; clientId: string }
  | { status: 'pending' }
  | { status: 'missing' };

const LOCAL_ID_PREFIX = 'local:';

// A clínica cadastrada offline ainda não tem id do backend; este faz o papel
// dele (inclusive no clientId de um agendamento) até a sincronização.
export function localClientId(uuid: string): string {
  return `${LOCAL_ID_PREFIX}${uuid}`;
}

export function isLocalClientId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX);
}

export function pendingCreateToClient(
  localId: string,
  payload: OfflineClientPayload,
): Client {
  return {
    id: localId,
    type: payload.type,
    name: payload.name,
    taxId: payload.taxId ?? null,
    taxIdType: payload.taxIdType ?? null,
    contactName: payload.contactName ?? null,
    email: payload.email ?? null,
    phone: payload.phone ?? null,
    addressLine: payload.addressLine ?? null,
    city: payload.city ?? null,
    state: payload.state ?? null,
    serviceDays: [],
    paymentTermsDays: null,
    preferredPaymentMethod: null,
    active: true,
    createdAt: '',
    updatedAt: '',
  };
}

/**
 * Editar uma clínica que ainda nem foi criada no backend entra no próprio
 * create; editar de novo algo já pendente junta as mudanças.
 */
export function enqueueClientUpdate(
  queue: readonly PendingClientOperation[],
  clientId: string,
  changes: OfflineClientChanges,
): PendingClientOperation[] {
  if (isLocalClientId(clientId)) {
    return queue.map(operation =>
      operation.kind === 'create' && operation.localId === clientId
        ? { ...operation, payload: { ...operation.payload, ...changes } }
        : operation,
    );
  }
  const existing = queue.find(
    operation => operation.kind === 'update' && operation.clientId === clientId,
  );
  if (!existing) {
    return [...queue, { kind: 'update', clientId, changes }];
  }
  return queue.map(operation =>
    operation === existing && operation.kind === 'update'
      ? { ...operation, changes: { ...operation.changes, ...changes } }
      : operation,
  );
}

/** A lista de clínicas como o usuário a deixou, com a fila por cima. */
export function applyPendingClientOperations(
  clients: readonly Client[],
  queue: readonly PendingClientOperation[],
): Client[] {
  const edited = clients.map(client => {
    const update = queue.find(
      operation =>
        operation.kind === 'update' && operation.clientId === client.id,
    );
    return update && update.kind === 'update'
      ? { ...client, ...toClientFields(update.changes) }
      : client;
  });
  const created = queue.flatMap(operation =>
    operation.kind === 'create'
      ? [pendingCreateToClient(operation.localId, operation.payload)]
      : [],
  );
  return [...edited, ...created];
}

// No payload um campo apagado vem ausente; no Client ele é null.
function toClientFields(changes: OfflineClientChanges): Partial<Client> {
  return Object.fromEntries(
    Object.entries(changes).map(([key, value]) => [key, value ?? null]),
  );
}

// O backend recusa dois tomadores com o mesmo nome (DUPLICATED_CLIENT_NAME);
// sem rede, a mesma regra vale contra a lista salva.
export function hasClientNamed(
  clients: readonly Client[],
  name: string,
  exceptId?: string,
): boolean {
  const needle = normalizeForSearch(name);
  return clients.some(
    client =>
      client.id !== exceptId && normalizeForSearch(client.name) === needle,
  );
}

// O CNPJ também é único no backend (DUPLICATED_CLIENT_TAX_ID).
export function hasClientWithTaxId(
  clients: readonly Client[],
  taxId: string,
  exceptId?: string,
): boolean {
  const digits = taxId.replace(/\D/g, '');
  return (
    digits !== '' &&
    clients.some(
      client =>
        client.id !== exceptId &&
        (client.taxId ?? '').replace(/\D/g, '') === digits,
    )
  );
}

export type OfflineDuplicates = { name: boolean; taxId: boolean };

/** As regras de unicidade do backend, aplicadas à lista salva. */
export function findDuplicates(
  clients: readonly Client[],
  candidate: { name?: string; taxId?: string },
  exceptId?: string,
): OfflineDuplicates {
  return {
    name:
      candidate.name !== undefined &&
      hasClientNamed(clients, candidate.name, exceptId),
    taxId:
      candidate.taxId !== undefined &&
      hasClientWithTaxId(clients, candidate.taxId, exceptId),
  };
}
