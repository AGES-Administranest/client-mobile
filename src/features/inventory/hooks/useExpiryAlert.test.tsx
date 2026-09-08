import ReactTestRenderer from 'react-test-renderer';

import { useExpiryAlert } from './useExpiryAlert';
import { ExpiringItem, IsoDate } from '../domain/expiryAlert';
import { EXPIRY_NOTIFICATION_HOUR } from '../domain/expirySchedule';

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

function item(id: string, days: number): ExpiringItem {
  return { id, name: id, expirationDate: isoIn(days) };
}

function Probe({ items }: { items: ExpiringItem[] }) {
  useExpiryAlert(items, translate, NOW);
  return null;
}

async function mount(initialItems: ExpiringItem[]) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Probe items={initialItems} />);
  });

  return async (nextItems: ExpiringItem[]) => {
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
