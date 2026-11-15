import {
  applyPendingSupplierOperations,
  enqueueSupplierUpdate,
  hasSupplierWithTaxId,
  type PendingSupplierOperation,
} from './offlineSuppliers';
import type { Supplier } from './supplierForm';

const BODY = {
  name: 'Vet Sul',
  email: null,
  taxId: null,
  taxIdType: null,
  phone: null,
};
const supplier = (overrides: Partial<Supplier>): Supplier => ({
  id: 's1',
  name: 'Antigo',
  email: null,
  taxId: null,
  phone: null,
  active: true,
  ...overrides,
});

describe('enqueueSupplierUpdate', () => {
  it('folds an edit of a not-yet-created supplier into its create', () => {
    const queue: PendingSupplierOperation[] = [
      { kind: 'create', localId: 'local:1', payload: BODY },
    ];
    expect(
      enqueueSupplierUpdate(queue, 'local:1', { name: 'Vet Norte' }),
    ).toEqual([
      {
        kind: 'create',
        localId: 'local:1',
        payload: { ...BODY, name: 'Vet Norte' },
      },
    ]);
  });

  it('merges repeated edits of the same server supplier', () => {
    const once = enqueueSupplierUpdate([], 's1', { phone: '1' });
    expect(enqueueSupplierUpdate(once, 's1', { name: 'X' })).toEqual([
      { kind: 'update', supplierId: 's1', changes: { phone: '1', name: 'X' } },
    ]);
  });
});

describe('applyPendingSupplierOperations', () => {
  it('puts edits and pending creates over the saved list', () => {
    const queue: PendingSupplierOperation[] = [
      {
        kind: 'update',
        supplierId: 's1',
        changes: { name: 'Novo', taxIdType: null, active: false },
      },
      { kind: 'create', localId: 'local:1', payload: BODY },
    ];
    expect(applyPendingSupplierOperations([supplier({})], queue)).toEqual([
      supplier({ name: 'Novo', active: false }),
      supplier({ id: 'local:1', name: 'Vet Sul' }),
    ]);
  });
});

describe('hasSupplierWithTaxId', () => {
  const list = [supplier({ taxId: '11.222.333/0001-81' })];
  it.each([
    ['same CNPJ without mask', '11222333000181', undefined, true],
    ['same supplier being edited', '11222333000181', 's1', false],
    ['other CNPJ', '11444777000161', undefined, false],
    ['empty', '', undefined, false],
  ])('%s', (_label, taxId, exceptId, expected) => {
    expect(hasSupplierWithTaxId(list, taxId, exceptId)).toBe(expected);
  });
});
