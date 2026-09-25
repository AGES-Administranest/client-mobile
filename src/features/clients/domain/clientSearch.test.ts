import type { Client } from './client';
import {
  addClient,
  filterClients,
  getClientSearchStatus,
  normalizeForSearch,
  type ClientSearchSnapshot,
} from './clientSearch';

function client(name: string, overrides: Partial<Client> = {}): Client {
  return {
    id: `id-${name}`,
    type: 'CLINIC',
    name,
    taxId: null,
    taxIdType: null,
    contactName: null,
    email: null,
    phone: null,
    addressLine: null,
    city: null,
    state: null,
    serviceDays: [],
    paymentTermsDays: null,
    preferredPaymentMethod: null,
    active: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('normalizeForSearch', () => {
  it.each([
    ['Clínica', 'clinica'],
    ['  ÁGUAS  ', 'aguas'],
    ['São João', 'sao joao'],
    ['Ação', 'acao'],
    ['abc', 'abc'],
  ])('%j → %j', (input, expected) => {
    expect(normalizeForSearch(input)).toBe(expected);
  });
});

describe('filterClients', () => {
  const list = [
    client('Clínica VetCenter'),
    client('Hospital Veterinário Pet Care'),
    client('Clínica Vida Animal'),
    client('Clínica Desativada', { active: false }),
  ];

  it('casa parte do nome sem diferenciar maiúsculas', () => {
    expect(filterClients(list, 'VETCENTER').map(c => c.name)).toEqual([
      'Clínica VetCenter',
    ]);
  });

  it('casa sem acento nos dois sentidos', () => {
    expect(filterClients(list, 'clinica').map(c => c.name)).toEqual([
      'Clínica VetCenter',
      'Clínica Vida Animal',
    ]);
    expect(filterClients(list, 'veterinário').map(c => c.name)).toEqual([
      'Hospital Veterinário Pet Care',
    ]);
  });

  it('funciona a partir de 1 caractere (o filtro é local, não há custo de rede)', () => {
    expect(filterClients(list, 'h').map(c => c.name)).toEqual([
      'Hospital Veterinário Pet Care',
    ]);
  });

  it('nunca oferece tomador inativo', () => {
    expect(filterClients(list, 'desativada')).toEqual([]);
  });

  it.each(['', '   '])('termo vazio (%j) não devolve a lista inteira', term => {
    expect(filterClients(list, term)).toEqual([]);
  });

  it('mantém a ordem da lista original', () => {
    expect(filterClients(list, 'c').map(c => c.name)).toEqual([
      'Clínica VetCenter',
      'Hospital Veterinário Pet Care',
      'Clínica Vida Animal',
    ]);
  });
});

describe('addClient', () => {
  it('encaixa o novo tomador em ordem alfabética', () => {
    const list = [client('Alfa'), client('Zeta')];
    expect(addClient(list, client('Meio')).map(c => c.name)).toEqual([
      'Alfa',
      'Meio',
      'Zeta',
    ]);
  });

  it('não duplica quando o id já está na lista', () => {
    const list = [client('Alfa')];
    const result = addClient(list, client('Alfa'));
    expect(result).toHaveLength(1);
  });

  it('ordena com a regra do português (acento não joga para o fim)', () => {
    const list = [client('Zeta')];
    expect(addClient(list, client('Águia')).map(c => c.name)).toEqual([
      'Águia',
      'Zeta',
    ]);
  });
});

describe('getClientSearchStatus', () => {
  const base: ClientSearchSnapshot = {
    term: 'vet',
    paused: false,
    isLoading: false,
    hasError: false,
    resultCount: 2,
  };

  it.each<[string, Partial<ClientSearchSnapshot>, string]>([
    ['campo vazio não mostra nada', { term: '' }, 'idle'],
    ['só espaços não mostra nada', { term: '   ' }, 'idle'],
    [
      'pausada (tomador já escolhido) não mostra nada',
      { paused: true },
      'idle',
    ],
    ['carregando a lista', { isLoading: true }, 'loading'],
    ['erro ao carregar a lista', { hasError: true }, 'error'],
    ['sem resultados', { resultCount: 0 }, 'empty'],
    ['com resultados', {}, 'results'],
  ])('%s', (_label, overrides, expected) => {
    expect(getClientSearchStatus({ ...base, ...overrides })).toBe(expected);
  });

  it('carregando vence resultados antigos', () => {
    expect(
      getClientSearchStatus({ ...base, isLoading: true, resultCount: 3 }),
    ).toBe('loading');
  });

  it('erro vence a lista vazia', () => {
    expect(
      getClientSearchStatus({ ...base, hasError: true, resultCount: 0 }),
    ).toBe('error');
  });
});
