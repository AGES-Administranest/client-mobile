import ReactTestRenderer from 'react-test-renderer';

import { ExpiringLot, IsoDate } from 'features/inventory/domain/expiryAlert';
import { EXPIRY_NOTIFICATION_HOUR } from 'features/inventory/domain/expirySchedule';
import { useExpiryAlert } from 'features/inventory/hooks/useExpiryAlert';

// O prefixo `mock` é a exceção que o jest permite referenciar de dentro da
// factory de jest.mock, que é içada para o topo do arquivo.
let mockNextId = 0;
const mockScheduleAt = jest.fn(
  async (_input: { title: string; body?: string }, _date: Date) =>
    `notification-${(mockNextId += 1)}`,
);
const mockCancel = jest.fn(async (_id: string) => undefined);
const mockStorage = new Map<string, string>();

jest.mock('shared/services', () => ({
  scheduleNotificationAt: (input: { title: string; body?: string }, d: Date) =>
    mockScheduleAt(input, d),
  cancelNotification: (id: string) => mockCancel(id),
  initNotifications: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: async (key: string) => mockStorage.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      mockStorage.set(key, value);
    },
  },
}));

const translate = (key: string, params?: Record<string, string | number>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const NOW = new Date(2026, 8, 8, 14, 30);

function isoIn(days: number): IsoDate {
  const date = new Date(NOW);
  date.setDate(date.getDate() + days);

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}` as IsoDate;
}

function item(id: string, days: number): ExpiringLot {
  return { id, itemId: id, name: id, expirationDate: isoIn(days) };
}

function Probe({ items }: { items: ExpiringLot[] }) {
  useExpiryAlert('test-user', items, translate, NOW);
  return null;
}

async function mount(initialItems: ExpiringLot[]) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Probe items={initialItems} />);
  });

  return async (nextItems: ExpiringLot[]) => {
    await ReactTestRenderer.act(async () => {
      renderer.update(<Probe items={nextItems} />);
    });
  };
}

beforeEach(() => {
  mockStorage.clear();
  mockScheduleAt.mockClear();
  mockCancel.mockClear();
  mockNextId = 0;
});

// A regressão que motivou a mudança: antes, item longe do vencimento era
// simplesmente ignorado e o aviso nunca chegava.
it('agenda um item que vence daqui a 40 dias', async () => {
  await mount([item('propofol', 40)]);

  expect(mockScheduleAt).toHaveBeenCalledTimes(1);

  const fireAt = mockScheduleAt.mock.calls[0][1];
  const expected = new Date(NOW);
  expected.setDate(expected.getDate() + 33);
  expected.setHours(EXPIRY_NOTIFICATION_HOUR, 0, 0, 0);

  expect(fireAt).toEqual(expected);
});

it('não agenda item já vencido', async () => {
  await mount([item('propofol', -3)]);

  expect(mockScheduleAt).not.toHaveBeenCalled();
});

it('agrupa numa notificação só os itens da mesma data', async () => {
  await mount([item('propofol', 20), item('cetamina', 20)]);

  expect(mockScheduleAt).toHaveBeenCalledTimes(1);
  expect(mockScheduleAt.mock.calls[0][0].title).toContain(
    'inventory.expiryAlert.titlePlural',
  );
});

it('não reagenda quando a lista não muda', async () => {
  const update = await mount([item('propofol', 20)]);
  mockScheduleAt.mockClear();

  await update([item('propofol', 20)]);

  expect(mockScheduleAt).not.toHaveBeenCalled();
  expect(mockCancel).not.toHaveBeenCalled();
});

it('cancela o agendamento quando o item sai da lista', async () => {
  const update = await mount([item('propofol', 20)]);
  mockScheduleAt.mockClear();

  await update([]);

  expect(mockCancel).toHaveBeenCalledTimes(1);
  expect(mockCancel).toHaveBeenCalledWith('notification-1');
  expect(mockScheduleAt).not.toHaveBeenCalled();
});

it('cancela e reagenda quando a validade é editada', async () => {
  const update = await mount([item('propofol', 20)]);
  mockScheduleAt.mockClear();

  await update([item('propofol', 30)]);

  expect(mockCancel).toHaveBeenCalledWith('notification-1');
  expect(mockScheduleAt).toHaveBeenCalledTimes(1);
});

it('mantém o agendamento entre montagens do app', async () => {
  await mount([item('propofol', 20)]);
  mockScheduleAt.mockClear();

  // Reabrir o app não pode duplicar o que já está agendado no SO.
  await mount([item('propofol', 20)]);

  expect(mockScheduleAt).not.toHaveBeenCalled();
});

it('preenche a agenda quando o tempo libera espaço, sem alterar itens', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 8, 8, 23, 59));
  const items = Array.from({ length: 49 }, (_, index) =>
    item(`lot-${index}`, index),
  );
  let renderer: ReactTestRenderer.ReactTestRenderer;
  function Live() {
    useExpiryAlert('test-user', items, translate);
    return null;
  }
  try {
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<Live />);
    });
    expect(mockScheduleAt).toHaveBeenCalledTimes(48);
    mockScheduleAt.mockClear();
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(60000);
    });
    expect(mockScheduleAt).toHaveBeenCalledTimes(1);
    expect(mockScheduleAt.mock.calls[0][0].body).toContain('lot-48');
  } finally {
    await ReactTestRenderer.act(async () => renderer!.unmount());
    jest.useRealTimers();
  }
});

it('preserva sucessos parciais e recupera a fila após falha', async () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  mockScheduleAt.mockResolvedValueOnce('saved-first');
  mockScheduleAt.mockRejectedValueOnce(new Error('OS unavailable'));
  try {
    const update = await mount([item('first', 20), item('second', 30)]);
    mockScheduleAt.mockClear();
    await update([item('first', 20), item('second', 30), item('third', 40)]);
    expect(mockScheduleAt).toHaveBeenCalledTimes(2);
    expect(
      mockScheduleAt.mock.calls.map(([input]) => input.body).join(' '),
    ).not.toContain('first');
  } finally {
    warning.mockRestore();
  }
});

it('recupera a fila após falha ao cancelar', async () => {
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    const update = await mount([item('first', 20)]);
    mockCancel.mockRejectedValueOnce(new Error('OS unavailable'));
    await update([]);
    await update([item('second', 30)]);
    expect(mockCancel).toHaveBeenCalledTimes(2);
    expect(mockScheduleAt.mock.calls.at(-1)?.[0].body).toContain('second');
  } finally {
    warning.mockRestore();
  }
});
