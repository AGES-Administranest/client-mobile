import type { Supplier, SupplierPayload } from './supplierForm';

/** O corpo de um POST /supplier; `active` só vai num PATCH. */
export type OfflineSupplierPayload = {
  name: string;
  email: string | null;
  taxId: string | null;
  taxIdType: 'CNPJ' | null;
  phone: string | null;
  active?: boolean;
};

export type PendingSupplierOperation =
  | { kind: 'create'; localId: string; payload: OfflineSupplierPayload }
  | {
      kind: 'update';
      supplierId: string;
      changes: Partial<OfflineSupplierPayload>;
    };

export type SupplierSyncRejection = {
  operation: PendingSupplierOperation;
  code: string | null;
};

const LOCAL_ID_PREFIX = 'local:';

// O fornecedor cadastrado offline ainda não tem id do backend; este faz o
// papel dele até a sincronização.
export function localSupplierId(uuid: string): string {
  return `${LOCAL_ID_PREFIX}${uuid}`;
}

export function isLocalSupplierId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX);
}

// taxId e taxIdType andam juntos; o CNPJ é o único tipo aceito.
export function toSupplierBody(
  payload: SupplierPayload,
): OfflineSupplierPayload {
  return {
    name: payload.name,
    email: payload.email,
    taxId: payload.taxId,
    taxIdType: payload.taxId ? 'CNPJ' : null,
    phone: payload.phone,
    active: payload.active,
  };
}

export function pendingCreateToSupplier(
  localId: string,
  payload: OfflineSupplierPayload,
): Supplier {
  return {
    id: localId,
    name: payload.name,
    email: payload.email,
    taxId: payload.taxId,
    phone: payload.phone,
    active: payload.active ?? true,
  };
}

/**
 * Editar um fornecedor que ainda nem foi criado no backend entra no próprio
 * create; editar de novo algo já pendente junta as mudanças.
 */
export function enqueueSupplierUpdate(
  queue: readonly PendingSupplierOperation[],
  supplierId: string,
  changes: Partial<OfflineSupplierPayload>,
): PendingSupplierOperation[] {
  if (isLocalSupplierId(supplierId)) {
    return queue.map(operation =>
      operation.kind === 'create' && operation.localId === supplierId
        ? { ...operation, payload: { ...operation.payload, ...changes } }
        : operation,
    );
  }
  const existing = queue.find(
    operation =>
      operation.kind === 'update' && operation.supplierId === supplierId,
  );
  if (!existing) {
    return [...queue, { kind: 'update', supplierId, changes }];
  }
  return queue.map(operation =>
    operation === existing && operation.kind === 'update'
      ? { ...operation, changes: { ...operation.changes, ...changes } }
      : operation,
  );
}

/** A lista de fornecedores como o usuário a deixou, com a fila por cima. */
export function applyPendingSupplierOperations(
  suppliers: readonly Supplier[],
  queue: readonly PendingSupplierOperation[],
): Supplier[] {
  const edited = suppliers.map(supplier => {
    const update = queue.find(
      operation =>
        operation.kind === 'update' && operation.supplierId === supplier.id,
    );
    if (!update || update.kind !== 'update') return supplier;
    // O Supplier da tela não guarda o tipo do documento.
    const fields = { ...update.changes };
    delete fields.taxIdType;
    return { ...supplier, ...fields } as Supplier;
  });
  const created = queue.flatMap(operation =>
    operation.kind === 'create'
      ? [pendingCreateToSupplier(operation.localId, operation.payload)]
      : [],
  );
  return [...edited, ...created];
}

// O CNPJ é único no backend (DUPLICATED_SUPPLIER_TAX_ID); sem rede, a mesma
// regra vale contra a lista salva e a fila.
export function hasSupplierWithTaxId(
  suppliers: readonly Supplier[],
  taxId: string,
  exceptId?: string,
): boolean {
  const wanted = unmaskTaxId(taxId);
  return (
    wanted !== '' &&
    suppliers.some(
      supplier =>
        supplier.id !== exceptId &&
        unmaskTaxId(supplier.taxId ?? '') === wanted,
    )
  );
}

export function unmaskTaxId(taxId: string): string {
  return taxId.replace(/[^0-9a-z]/gi, '').toUpperCase();
}
