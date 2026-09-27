import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';

import { useClientSearch } from './useClientSearch';
import type { Client } from '../domain/client';
import { MAX_VISIBLE_RESULTS } from '../domain/clientSearch';
import { fetchClients } from '../services/clientService';

jest.mock('../services/clientService', () => ({
  fetchClients: jest.fn(),
  createClient: jest.fn(),
}));
// A sessão entra pronta pelo AuthProvider; nada de auth pode ir à rede.
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const fetchMock = fetchClients as jest.MockedFunction<typeof fetchClients>;

const SESSION = {
  idToken: 'id-token',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

const ACCOUNT: Account = {
  id: 'user-1',
  name: 'Bruna Senha',
  email: 'bruna@example.com',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

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

const CATALOG = [
  client('Clínica VetCenter'),
  client('Hospital Veterinário Pet Care'),
  client('Clínica Vida Animal'),
];

type Deferred = {
  promise: Promise<Client[]>;
  resolve: (clients: Client[]) => void;
  reject: (error: Error) => void;
};

function deferred(): Deferred {
  let resolve!: Deferred['resolve'];
  let reject!: Deferred['reject'];
  const promise = new Promise<Client[]>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function mountHook(
  initial: { active: boolean; paused: boolean } = {
    active: true,
    paused: false,
  },
  withSession = true,
) {
  const result = {
    current: null as unknown as ReturnType<typeof useClientSearch>,
  };
  let props = initial;

  function Harness() {
    result.current = useClientSearch(props);
    return null;
  }

  const tree = () => (
    <AuthProvider
      initialSession={withSession ? SESSION : null}
      initialAccount={withSession ? ACCOUNT : null}
    >
      <Harness />
    </AuthProvider>
  );
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(tree());
  });

  return {
    result,
    setProps: async (next: Partial<typeof initial>) => {
      props = { ...props, ...next };
      await act(async () => renderer.update(tree()));
    },
  };
}

async function type(
  result: { current: ReturnType<typeof useClientSearch> },
  term: string,
) {
  await act(async () => result.current.onTermChange(term));
}

const names = (result: { current: ReturnType<typeof useClientSearch> }) =>
  result.current.options.map(c => c.name);

beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue(CATALOG);
});

test('não busca a lista enquanto o formulário está fechado', async () => {
  await mountHook({ active: false, paused: false });

  expect(fetchMock).not.toHaveBeenCalled();
});

test('sem sessão não chama a API', async () => {
  await mountHook({ active: true, paused: false }, false);

  expect(fetchMock).not.toHaveBeenCalled();
});

test('busca a lista completa uma vez, com o token, e não a cada tecla', async () => {
  const { result } = await mountHook();

  await type(result, 'v');
  await type(result, 've');
  await type(result, 'vet');

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledWith('id-token');
  expect(names(result)).toEqual([
    'Clínica VetCenter',
    'Hospital Veterinário Pet Care',
  ]);
  expect(result.current.status).toBe('results');
});

test('o filtro reage a cada tecla, sem acento e sem diferenciar maiúsculas', async () => {
  const { result } = await mountHook();

  await type(result, 'CLINICA');
  expect(names(result)).toEqual(['Clínica VetCenter', 'Clínica Vida Animal']);

  await type(result, 'clinica v');
  expect(names(result)).toEqual(['Clínica VetCenter', 'Clínica Vida Animal']);

  await type(result, 'clinica vi');
  expect(names(result)).toEqual(['Clínica Vida Animal']);
});

test('mostra "loading" enquanto a lista não chegou e filtra assim que chega', async () => {
  const pending = deferred();
  fetchMock.mockReturnValueOnce(pending.promise);
  const { result } = await mountHook();

  await type(result, 'vet');
  expect(result.current.status).toBe('loading');

  await act(async () => pending.resolve(CATALOG));
  expect(result.current.status).toBe('results');
});

test('tomador inativo nunca aparece', async () => {
  fetchMock.mockResolvedValue([
    client('Clínica Ativa'),
    client('Clínica Antiga', { active: false }),
  ]);
  const { result } = await mountHook();

  await type(result, 'clínica');

  expect(names(result)).toEqual(['Clínica Ativa']);
});

test('sem correspondência o status é "empty"', async () => {
  const { result } = await mountHook();

  await type(result, 'zzz');

  expect(result.current.status).toBe('empty');
});

test('mostra no máximo MAX_VISIBLE_RESULTS linhas', async () => {
  fetchMock.mockResolvedValue(
    Array.from({ length: MAX_VISIBLE_RESULTS + 3 }, (_, i) =>
      client(`Clínica ${i}`),
    ),
  );
  const { result } = await mountHook();

  await type(result, 'clí');

  expect(result.current.options).toHaveLength(MAX_VISIBLE_RESULTS);
});

test('reabrir o formulário busca a lista de novo e mantém a antiga enquanto carrega', async () => {
  const { result, setProps } = await mountHook();
  await type(result, 'vet');
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await setProps({ active: false });
  const refresh = deferred();
  fetchMock.mockReturnValueOnce(refresh.promise);
  await setProps({ active: true });

  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(result.current.status).toBe('results');
  expect(names(result)).toContain('Clínica VetCenter');

  await act(async () =>
    refresh.resolve([...CATALOG, client('Vet Novo (criado na aba Clínicas)')]),
  );
  expect(names(result)).toContain('Vet Novo (criado na aba Clínicas)');
});

test('a resposta de uma abertura antiga não sobrescreve a da abertura atual', async () => {
  const first = deferred();
  const second = deferred();
  fetchMock
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  const { result, setProps } = await mountHook();

  await setProps({ active: false });
  await setProps({ active: true });
  await act(async () => second.resolve([client('Clínica Atual')]));
  await act(async () => first.resolve([client('Clínica Velha')]));
  await type(result, 'clínica');

  expect(names(result)).toEqual(['Clínica Atual']);
});

test('falha sem lista em mãos vira "error"; digitar de novo tenta outra vez até dar certo', async () => {
  fetchMock
    .mockRejectedValueOnce(new Error('network'))
    .mockRejectedValueOnce(new Error('network'));
  const { result } = await mountHook();
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await type(result, 'vet');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(result.current.status).toBe('error');

  await type(result, 'vetc');

  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(result.current.status).toBe('results');
  expect(names(result)).toEqual(['Clínica VetCenter']);
});

test('falha ao atualizar com lista em mãos é silenciosa: segue usando a antiga', async () => {
  const { result, setProps } = await mountHook();
  await type(result, 'vet');

  await setProps({ active: false });
  fetchMock.mockRejectedValueOnce(new Error('network'));
  await setProps({ active: true });

  expect(result.current.status).toBe('results');
  expect(names(result)).toContain('Clínica VetCenter');
});

test('pausada esconde a lista, mas mantém o termo', async () => {
  const { result, setProps } = await mountHook();
  await type(result, 'vet');
  expect(result.current.status).toBe('results');

  await setProps({ paused: true });

  expect(result.current.status).toBe('idle');
  expect(result.current.options).toEqual([]);
  expect(result.current.term).toBe('vet');
});

test('addCreated encaixa o tomador novo na lista já carregada, sem novo GET', async () => {
  const { result } = await mountHook();
  await type(result, 'nova');
  expect(result.current.status).toBe('empty');

  await act(async () => result.current.addCreated(client('Clínica Nova Vida')));

  expect(names(result)).toEqual(['Clínica Nova Vida']);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('reset limpa o termo', async () => {
  const { result } = await mountHook();
  await type(result, 'vet');

  await act(async () => result.current.reset());

  expect(result.current.term).toBe('');
  expect(result.current.status).toBe('idle');
});
