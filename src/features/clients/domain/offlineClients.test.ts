import type { Client } from './client';
import {
  applyPendingClientOperations,
  enqueueClientUpdate,
  findDuplicates,
  hasClientNamed,
  isLocalClientId,
  localClientId,
  type PendingClientOperation,
} from './offlineClients';

const SERVER: Client = {
  id: 'server-1',
  type: 'CLINIC',
  name: 'Clínica VetNova',
  taxId: null,
  taxIdType: null,
  contactName: null,
  email: null,
  phone: null,
  addressLine: null,
  city: 'Porto Alegre',
  state: 'RS',
  serviceDays: [],
  paymentTermsDays: null,
  preferredPaymentMethod: null,
  active: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const CREATE: PendingClientOperation = {
  kind: 'create',
  localId: localClientId('uuid-1'),
  payload: { type: 'CLINIC', name: 'Clínica Casa', city: 'Canoas' },
};

test('o id local é reconhecido e o do backend não', () => {
  expect(isLocalClientId(localClientId('uuid-1'))).toBe(true);
  expect(isLocalClientId('server-1')).toBe(false);
});

describe('enqueueClientUpdate', () => {
  it('edição de uma clínica criada offline entra no próprio create', () => {
    const queue = enqueueClientUpdate([CREATE], 'local:uuid-1', {
      name: 'Clínica Casa Nova',
    });
    expect(queue).toEqual([
      {
        ...CREATE,
        payload: { ...CREATE.payload, name: 'Clínica Casa Nova' },
      },
    ]);
  });

  it('duas edições de uma clínica do backend se juntam numa operação', () => {
    const once = enqueueClientUpdate([], 'server-1', { city: 'Canoas' });
    const twice = enqueueClientUpdate(once, 'server-1', { phone: '51999' });
    expect(twice).toEqual([
      {
        kind: 'update',
        clientId: 'server-1',
        changes: { city: 'Canoas', phone: '51999' },
      },
    ]);
  });
});

describe('applyPendingClientOperations', () => {
  it('aplica a edição e soma as criadas offline, ativas e com id local', () => {
    const list = applyPendingClientOperations(
      [SERVER],
      [
        { kind: 'update', clientId: 'server-1', changes: { city: 'Canoas' } },
        CREATE,
      ],
    );
    expect(list).toHaveLength(2);
    expect(list[0]).toMatchObject({ id: 'server-1', city: 'Canoas' });
    expect(list[1]).toMatchObject({
      id: 'local:uuid-1',
      name: 'Clínica Casa',
      active: true,
      phone: null,
    });
  });
});

describe('hasClientNamed', () => {
  it.each([
    ['o mesmo nome', 'Clínica VetNova', undefined, true],
    ['sem acento e em minúsculas', 'clinica vetnova', undefined, true],
    ['outro nome', 'Clínica Casa', undefined, false],
    ['a própria clínica, ao editar', 'Clínica VetNova', 'server-1', false],
  ])('%s', (_label, name, exceptId, expected) => {
    expect(hasClientNamed([SERVER], name, exceptId)).toBe(expected);
  });
});

describe('findDuplicates', () => {
  const WITH_CNPJ: Client = {
    ...SERVER,
    taxId: '11222333000181',
    taxIdType: 'CNPJ',
  };

  it.each([
    [
      'mesmo CNPJ, outro nome',
      { name: 'Clínica Nova', taxId: '11222333000181' },
      undefined,
      { name: false, taxId: true },
    ],
    [
      'mesmo CNPJ com pontuação',
      { name: 'Clínica Nova', taxId: '11.222.333/0001-81' },
      undefined,
      { name: false, taxId: true },
    ],
    [
      'mesmo nome e mesmo CNPJ',
      { name: 'clinica vetnova', taxId: '11222333000181' },
      undefined,
      { name: true, taxId: true },
    ],
    [
      'sem CNPJ informado',
      { name: 'Clínica Nova' },
      undefined,
      { name: false, taxId: false },
    ],
    [
      'a própria clínica, ao editar',
      { name: 'Clínica VetNova', taxId: '11222333000181' },
      'server-1',
      { name: false, taxId: false },
    ],
  ])('%s', (_label, candidate, exceptId, expected) => {
    expect(findDuplicates([WITH_CNPJ], candidate, exceptId)).toEqual(expected);
  });
});
