import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { fetchClients } from 'features/clients';

import { useDiaDia, type DiaDiaState } from './useDiaDia';
import { buildAppointment } from '../domain/appointment.fixture';
import type { AppointmentResult } from '../domain/procedure.types';
import { fetchAppointments } from '../services/procedureService';

jest.mock('../services/procedureService', () => ({
  fetchAppointments: jest.fn(),
}));
jest.mock('features/clients/services/clientService', () => ({
  fetchClients: jest.fn(),
  createClient: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const fetchAppointmentsMock = fetchAppointments as jest.MockedFunction<
  typeof fetchAppointments
>;
const fetchClientsMock = fetchClients as jest.MockedFunction<
  typeof fetchClients
>;

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

const PAGE_SIZE = 20;

function page(count: number, firstId = 1): AppointmentResult[] {
  return Array.from({ length: count }, (_, index) =>
    buildAppointment({ id: `appointment-${firstId + index}` }),
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

async function mountHook() {
  const result = { current: null as unknown as DiaDiaState };

  function Harness() {
    result.current = useDiaDia();
    return null;
  }

  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Harness />
      </AuthProvider>,
    );
  });

  return { result };
}

function ids(state: DiaDiaState): string[] {
  return state.items.map(item => item.appointment.id);
}

beforeEach(() => {
  jest.clearAllMocks();
  fetchAppointmentsMock.mockResolvedValue([]);
  fetchClientsMock.mockResolvedValue([]);
});

describe('primeira página', () => {
  test('pede a página 1 de 20, só COMPLETED e sem período', async () => {
    await mountHook();

    expect(fetchAppointmentsMock).toHaveBeenCalledTimes(1);
    expect(fetchAppointmentsMock).toHaveBeenCalledWith('id-token', {
      status: 'COMPLETED',
      page: 1,
      pageSize: PAGE_SIZE,
    });
  });

  test('começa carregando e termina com os itens na ordem que o servidor mandou', async () => {
    const first = deferred<AppointmentResult[]>();
    fetchAppointmentsMock.mockReturnValue(first.promise);
    const { result } = await mountHook();
    expect(result.current.isLoading).toBe(true);

    await act(async () => first.resolve(page(3)));

    expect(result.current.isLoading).toBe(false);
    expect(ids(result.current)).toEqual([
      'appointment-1',
      'appointment-2',
      'appointment-3',
    ]);
  });

  test('lista vazia termina o carregamento sem erro', async () => {
    const { result } = await mountHook();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
    expect(result.current.items).toEqual([]);
  });

  test('falha na primeira carga marca erro, e retry busca de novo', async () => {
    fetchAppointmentsMock.mockRejectedValueOnce(new Error('rede'));
    const { result } = await mountHook();
    expect(result.current.hasError).toBe(true);
    expect(result.current.isLoading).toBe(false);

    fetchAppointmentsMock.mockResolvedValue(page(2));
    await act(async () => result.current.retry());

    expect(result.current.hasError).toBe(false);
    expect(ids(result.current)).toHaveLength(2);
  });
});

describe('nome do tomador', () => {
  test('busca os tomadores uma vez só, não uma por atendimento', async () => {
    fetchAppointmentsMock.mockResolvedValue(page(5));
    await mountHook();

    expect(fetchClientsMock).toHaveBeenCalledTimes(1);
    expect(fetchClientsMock).toHaveBeenCalledWith('id-token');
  });

  test('resolve o nome pelo clientId', async () => {
    fetchAppointmentsMock.mockResolvedValue([
      buildAppointment({ id: 'a', clientId: 'client-2' }),
    ]);
    fetchClientsMock.mockResolvedValue([
      { id: 'client-2', name: 'Hospital Pet Care' },
    ] as never);
    const { result } = await mountHook();

    expect(result.current.items[0].clientName).toBe('Hospital Pet Care');
  });

  test('cai no location antigo quando a busca de tomadores falha', async () => {
    fetchAppointmentsMock.mockResolvedValue([
      buildAppointment({ location: 'Clínica Antiga' }),
    ]);
    fetchClientsMock.mockRejectedValue(new Error('rede'));
    const { result } = await mountHook();

    expect(result.current.hasError).toBe(false);
    expect(result.current.items[0].clientName).toBe('Clínica Antiga');
  });

  test('deixa o nome nulo sem tomador nem location, para a tela avisar', async () => {
    fetchAppointmentsMock.mockResolvedValue([buildAppointment()]);
    const { result } = await mountHook();

    expect(result.current.items[0].clientName).toBeNull();
  });
});

describe('scroll infinito', () => {
  test('página cheia permite carregar a próxima e acrescenta ao fim', async () => {
    fetchAppointmentsMock.mockResolvedValueOnce(page(PAGE_SIZE));
    const { result } = await mountHook();
    fetchAppointmentsMock.mockResolvedValueOnce(page(3, 21));

    await act(async () => result.current.loadMore());

    expect(fetchAppointmentsMock).toHaveBeenLastCalledWith('id-token', {
      status: 'COMPLETED',
      page: 2,
      pageSize: PAGE_SIZE,
    });
    expect(result.current.items).toHaveLength(23);
    expect(ids(result.current).at(-1)).toBe('appointment-23');
    expect(result.current.isLoadingMore).toBe(false);
  });

  test('página incompleta encerra: loadMore deixa de pedir', async () => {
    fetchAppointmentsMock.mockResolvedValueOnce(page(PAGE_SIZE - 1));
    const { result } = await mountHook();

    await act(async () => result.current.loadMore());

    expect(fetchAppointmentsMock).toHaveBeenCalledTimes(1);
  });

  test('página vazia depois de uma cheia também encerra', async () => {
    fetchAppointmentsMock.mockResolvedValueOnce(page(PAGE_SIZE));
    const { result } = await mountHook();
    fetchAppointmentsMock.mockResolvedValueOnce([]);
    await act(async () => result.current.loadMore());

    await act(async () => result.current.loadMore());

    expect(fetchAppointmentsMock).toHaveBeenCalledTimes(2);
    expect(result.current.items).toHaveLength(PAGE_SIZE);
  });

  test('encadeia páginas: a 3ª é a página 3', async () => {
    fetchAppointmentsMock.mockResolvedValueOnce(page(PAGE_SIZE));
    const { result } = await mountHook();
    fetchAppointmentsMock.mockResolvedValueOnce(page(PAGE_SIZE, 21));
    await act(async () => result.current.loadMore());
    fetchAppointmentsMock.mockResolvedValueOnce(page(1, 41));

    await act(async () => result.current.loadMore());

    expect(fetchAppointmentsMock).toHaveBeenLastCalledWith(
      'id-token',
      expect.objectContaining({ page: 3 }),
    );
    expect(result.current.items).toHaveLength(41);
  });

  test('não pede a próxima página enquanto a primeira ainda carrega', async () => {
    const first = deferred<AppointmentResult[]>();
    fetchAppointmentsMock.mockReturnValue(first.promise);
    const { result } = await mountHook();

    await act(async () => result.current.loadMore());

    expect(fetchAppointmentsMock).toHaveBeenCalledTimes(1);
  });

  test('chamadas repetidas do onEndReached não duplicam a requisição em andamento', async () => {
    fetchAppointmentsMock.mockResolvedValueOnce(page(PAGE_SIZE));
    const { result } = await mountHook();
    const second = deferred<AppointmentResult[]>();
    fetchAppointmentsMock.mockReturnValueOnce(second.promise);

    await act(async () => {
      result.current.loadMore();
      result.current.loadMore();
    });
    expect(result.current.isLoadingMore).toBe(true);
    expect(fetchAppointmentsMock).toHaveBeenCalledTimes(2);

    await act(async () => second.resolve(page(2, 21)));
    expect(result.current.isLoadingMore).toBe(false);
  });

  test('descarta o item que a paginação por offset repetiu', async () => {
    fetchAppointmentsMock.mockResolvedValueOnce(page(PAGE_SIZE));
    const { result } = await mountHook();
    fetchAppointmentsMock.mockResolvedValueOnce(page(2, PAGE_SIZE));

    await act(async () => result.current.loadMore());

    expect(result.current.items).toHaveLength(PAGE_SIZE + 1);
  });

  test('falha ao carregar mais mantém os itens e não entra em laço', async () => {
    fetchAppointmentsMock.mockResolvedValueOnce(page(PAGE_SIZE));
    const { result } = await mountHook();
    fetchAppointmentsMock.mockRejectedValueOnce(new Error('rede'));
    await act(async () => result.current.loadMore());
    expect(result.current.hasError).toBe(true);
    expect(result.current.items).toHaveLength(PAGE_SIZE);

    await act(async () => result.current.loadMore());

    expect(fetchAppointmentsMock).toHaveBeenCalledTimes(2);
  });

  test('retry depois de falha ao carregar mais repete a mesma página', async () => {
    fetchAppointmentsMock.mockResolvedValueOnce(page(PAGE_SIZE));
    const { result } = await mountHook();
    fetchAppointmentsMock.mockRejectedValueOnce(new Error('rede'));
    await act(async () => result.current.loadMore());
    fetchAppointmentsMock.mockResolvedValueOnce(page(2, 21));

    await act(async () => result.current.retry());

    expect(fetchAppointmentsMock).toHaveBeenLastCalledWith(
      'id-token',
      expect.objectContaining({ page: 2 }),
    );
    expect(result.current.hasError).toBe(false);
    expect(result.current.items).toHaveLength(22);
    expect(fetchClientsMock).toHaveBeenCalledTimes(1);
  });
});

describe('filtro de período', () => {
  const RANGE = { from: '2026-08-06', to: '2026-08-08' };

  test('refaz a busca desde a página 1 com from/to em ISO', async () => {
    fetchAppointmentsMock.mockResolvedValueOnce(page(PAGE_SIZE));
    const { result } = await mountHook();
    await act(async () => {
      fetchAppointmentsMock.mockResolvedValueOnce(page(PAGE_SIZE, 21));
      result.current.loadMore();
    });
    fetchAppointmentsMock.mockResolvedValueOnce(page(2, 100));

    await act(async () => result.current.setRange(RANGE));

    expect(fetchAppointmentsMock).toHaveBeenLastCalledWith('id-token', {
      status: 'COMPLETED',
      page: 1,
      pageSize: PAGE_SIZE,
      from: new Date(2026, 7, 6, 0, 0, 0, 0).toISOString(),
      to: new Date(2026, 7, 8, 23, 59, 59, 999).toISOString(),
    });
    expect(ids(result.current)).toEqual(['appointment-100', 'appointment-101']);
    expect(result.current.isFiltering).toBe(true);
  });

  test('a paginação do filtro herda o período', async () => {
    const { result } = await mountHook();
    fetchAppointmentsMock.mockResolvedValueOnce(page(PAGE_SIZE));
    await act(async () => result.current.setRange(RANGE));
    fetchAppointmentsMock.mockResolvedValueOnce([]);

    await act(async () => result.current.loadMore());

    expect(fetchAppointmentsMock).toHaveBeenLastCalledWith(
      'id-token',
      expect.objectContaining({
        page: 2,
        from: new Date(2026, 7, 6, 0, 0, 0, 0).toISOString(),
      }),
    );
  });

  test('ignora a resposta atrasada de um período que já foi trocado', async () => {
    const stale = deferred<AppointmentResult[]>();
    fetchAppointmentsMock.mockReturnValueOnce(stale.promise);
    const { result } = await mountHook();
    fetchAppointmentsMock.mockResolvedValueOnce(page(1, 50));

    await act(async () => result.current.setRange(RANGE));
    await act(async () => stale.resolve(page(PAGE_SIZE, 1)));

    expect(ids(result.current)).toEqual(['appointment-50']);
  });

  test('ignora a próxima página que chega depois de o período mudar', async () => {
    fetchAppointmentsMock.mockResolvedValueOnce(page(PAGE_SIZE));
    const { result } = await mountHook();
    const stale = deferred<AppointmentResult[]>();
    fetchAppointmentsMock.mockReturnValueOnce(stale.promise);
    await act(async () => result.current.loadMore());
    fetchAppointmentsMock.mockResolvedValueOnce(page(1, 70));

    await act(async () => result.current.setRange(RANGE));
    await act(async () => stale.resolve(page(PAGE_SIZE, 21)));

    expect(ids(result.current)).toEqual(['appointment-70']);
    expect(result.current.isLoadingMore).toBe(false);
  });

  test('não refaz a busca de tomadores ao trocar o período', async () => {
    const { result } = await mountHook();

    await act(async () => result.current.setRange(RANGE));

    expect(fetchClientsMock).toHaveBeenCalledTimes(1);
  });

  test('limpar volta à busca sem período', async () => {
    const { result } = await mountHook();
    await act(async () => result.current.setRange(RANGE));

    await act(async () => result.current.clearRange());

    expect(fetchAppointmentsMock).toHaveBeenLastCalledWith('id-token', {
      status: 'COMPLETED',
      page: 1,
      pageSize: PAGE_SIZE,
    });
    expect(result.current.isFiltering).toBe(false);
  });
});

describe('refresh', () => {
  test('recarrega desde a página 1 e atualiza os nomes dos tomadores', async () => {
    fetchAppointmentsMock.mockResolvedValueOnce(page(PAGE_SIZE));
    const { result } = await mountHook();
    fetchAppointmentsMock.mockResolvedValueOnce(page(2, 90));

    await act(async () => result.current.refresh());

    expect(fetchAppointmentsMock).toHaveBeenLastCalledWith(
      'id-token',
      expect.objectContaining({ page: 1 }),
    );
    expect(ids(result.current)).toEqual(['appointment-90', 'appointment-91']);
    expect(fetchClientsMock).toHaveBeenCalledTimes(2);
  });
});
