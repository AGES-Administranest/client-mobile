import { DayAppointments } from 'features/procedures/screens/DayAppointments';
import {
  fetchAppointments,
  type AppointmentResult,
} from 'features/procedures/services/procedureService';

import { renderScreen } from '../../../support/screen';

const mockAuth = { session: { idToken: 'token' } as object | null };

jest.mock('features/auth', () => ({ useAuth: () => mockAuth }));
jest.mock('features/procedures/services/procedureService', () => ({
  fetchAppointments: jest.fn(),
}));
jest.mock('features/procedures/screens/AppointmentDetailScreen', () => ({
  AppointmentDetailScreen: (props: object) => {
    const { View } = require('react-native');
    return <View testID="detail" {...props} />;
  },
}));

const fetchDay = jest.mocked(fetchAppointments);

const appointment = (
  id: string,
  hour: number,
  overrides: Partial<AppointmentResult> = {},
) =>
  ({
    id,
    startsAt: new Date(2026, 9, 20, hour).toISOString(),
    patientName: id,
    procedureName: 'Anestesia',
    amount: null,
    status: 'SCHEDULED',
    ...overrides,
  } as AppointmentResult);

const byStatus = (
  answers: Partial<Record<string, AppointmentResult[]>>,
): void => {
  fetchDay.mockImplementation(async (_token, query) => {
    const { status } = query as { status: string };
    return answers[status] ?? [];
  });
};

const open = () => renderScreen(<DayAppointments refreshKey={0} />);

beforeEach(() => {
  jest.useFakeTimers({
    now: new Date(2026, 9, 20, 12),
    doNotFake: ['setImmediate', 'queueMicrotask', 'nextTick'],
  });
  fetchDay.mockReset();
  mockAuth.session = { idToken: 'token' };
  byStatus({});
});
afterEach(() => jest.useRealTimers());

describe('DayAppointments', () => {
  it('joins every status of the day in the order they start', async () => {
    byStatus({
      SCHEDULED: [appointment('Maya', 15)],
      COMPLETED: [
        appointment('Thor', 9, { status: 'COMPLETED', amount: '250.00' }),
      ],
      CANCELED: [
        appointment('x', 11, {
          status: 'CANCELED',
          patientName: null,
          procedureName: null,
        }),
      ],
    });

    const screen = await open();
    const text = screen.text().replace(/ /g, ' ');

    expect(text.indexOf('Thor')).toBeLessThan(text.indexOf('Sem nome'));
    expect(text.indexOf('Sem nome')).toBeLessThan(text.indexOf('Maya'));
    expect(text).toContain('09:00');
    expect(text).toContain('R$ 250');
    expect(text).toContain('Realizado');
    expect(text).toContain('Cancelado');
    expect(fetchDay).toHaveBeenCalledWith('token', {
      status: 'SCHEDULED',
      from: new Date(2026, 9, 20).toISOString(),
      to: new Date(2026, 9, 20, 23, 59, 59, 999).toISOString(),
    });
  });

  it('moves between days', async () => {
    const screen = await open();
    expect(screen.has('20 de out')).toBe(true);

    await screen.press('Próximo dia');
    expect(screen.has('21 de out')).toBe(true);
    await screen.press('Dia anterior');
    await screen.press('Dia anterior');
    expect(screen.has('19 de out')).toBe(true);
    expect(screen.has('Nenhum atendimento neste dia.')).toBe(true);
  });

  it('keeps the last day asked for when answers arrive out of order', async () => {
    const waiting: (() => void)[] = [];
    fetchDay.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          waiting.push(() => resolve([appointment('antigo', 9)]));
        }),
    );
    const screen = await open();
    byStatus({ SCHEDULED: [appointment('novo', 9)] });
    await screen.press('Próximo dia');

    await screen.act(() => waiting.forEach(answer => answer()));

    expect(screen.has('novo')).toBe(true);
    expect(screen.has('antigo')).toBe(false);
  });

  it('keeps the last day when the previous one fails late', async () => {
    let fail!: () => void;
    fetchDay.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail = () => reject(new Error('late'));
        }),
    );
    const screen = await open();
    byStatus({ SCHEDULED: [appointment('novo', 9)] });
    await screen.press('Próximo dia');

    await screen.act(() => fail());

    expect(screen.has('novo')).toBe(true);
  });

  it('says when the day could not be loaded', async () => {
    fetchDay.mockRejectedValue(new Error('broke'));

    expect(
      (await open()).has('Não foi possível carregar os atendimentos.'),
    ).toBe(true);
  });

  it('asks for nothing without a session', async () => {
    mockAuth.session = null;

    await open();

    expect(fetchDay).not.toHaveBeenCalled();
  });

  it('opens the detail and loads again when it changes something', async () => {
    byStatus({ SCHEDULED: [appointment('Maya', 15)] });
    const screen = await open();
    const detail = () => screen.root.findByProps({ testID: 'detail' }).props;
    expect(detail().appointmentId).toBeNull();

    const row = screen.root.findAll(
      node =>
        typeof node.props.onPress === 'function' &&
        node.findAll(child => child.props.children === 'Maya').length > 0,
    );
    await screen.act(() => row[row.length - 1].props.onPress());
    expect(detail().appointmentId).toBe('Maya');

    fetchDay.mockClear();
    await screen.act(() => detail().onChanged());
    expect(fetchDay).toHaveBeenCalledTimes(3);

    await screen.act(() => detail().onClose());
    expect(detail().appointmentId).toBeNull();
  });

  it('loads again when something was created elsewhere', async () => {
    const screen = await open();
    fetchDay.mockClear();

    await screen.update(<DayAppointments refreshKey={1} />);

    expect(fetchDay).toHaveBeenCalledTimes(3);
  });
});
