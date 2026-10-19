import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import {
  useRescheduleAppointment,
  type ReschedulableAppointment,
} from 'features/procedures/hooks/useRescheduleAppointment';
import { updateAppointment } from 'features/procedures/services/procedureService';
import { ApiError } from 'shared/services/apiClient';

jest.mock('features/procedures/services/procedureService', () => ({
  updateAppointment: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const updateMock = updateAppointment as jest.MockedFunction<
  typeof updateAppointment
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

// Longe no futuro, para a sugestão (dia seguinte) nunca cair no passado.
const APPOINTMENT: ReschedulableAppointment = {
  id: 'appointment-1',
  startsAt: new Date(2099, 0, 10, 14, 0).toISOString(),
  endsAt: new Date(2099, 0, 10, 15, 0).toISOString(),
};

async function mountHook(onChanged: () => void = jest.fn()) {
  const result = {
    current: null as unknown as ReturnType<typeof useRescheduleAppointment>,
  };

  function Harness() {
    result.current = useRescheduleAppointment(APPOINTMENT, onChanged);
    return null;
  }

  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Harness />
      </AuthProvider>,
    );
  });

  return result;
}

beforeEach(() => {
  updateMock.mockReset();
  updateMock.mockResolvedValue({} as never);
});

test('abre já sugerindo o dia seguinte no mesmo horário', async () => {
  const result = await mountHook();

  await act(async () => result.current.open());

  expect(result.current.visible).toBe(true);
  expect(result.current.values).toEqual({
    date: '11/01/2099',
    startTime: '14:00',
    endTime: '15:00',
  });
});

test('aplica a máscara ao digitar', async () => {
  const result = await mountHook();
  await act(async () => result.current.open());

  await act(async () => result.current.setField('date', '12012099'));
  await act(async () => result.current.setField('startTime', '0930'));

  expect(result.current.values.date).toBe('12/01/2099');
  expect(result.current.values.startTime).toBe('09:30');
});

test('confirmar salva início e fim novos, fecha e avisa', async () => {
  const onChanged = jest.fn();
  const result = await mountHook(onChanged);
  await act(async () => result.current.open());

  await act(async () => result.current.confirm());

  expect(updateMock).toHaveBeenCalledWith('id-token', 'appointment-1', {
    startsAt: new Date(2099, 0, 11, 14, 0).toISOString(),
    endsAt: new Date(2099, 0, 11, 15, 0).toISOString(),
  });
  expect(result.current.visible).toBe(false);
  expect(result.current.done).toBe(true);
  expect(onChanged).toHaveBeenCalledTimes(1);
});

test('campos inválidos não chamam o backend', async () => {
  const result = await mountHook();
  await act(async () => result.current.open());
  await act(async () => result.current.setField('endTime', '1300'));

  await act(async () => result.current.confirm());

  expect(result.current.errors.endTime).toBe('END_BEFORE_START');
  expect(updateMock).not.toHaveBeenCalled();
});

test.each([
  ['conflito de horário', 'APPOINTMENT_TIME_CONFLICT', 409, 'CONFLICT'],
  ['outra falha', 'INTERNAL', 500, 'FAILED'],
] as const)(
  '%s deixa a folha aberta com o erro',
  async (_label, code, status, failure) => {
    updateMock.mockRejectedValue(new ApiError('erro', code, status, null));
    const result = await mountHook();
    await act(async () => result.current.open());

    await act(async () => result.current.confirm());

    expect(result.current.visible).toBe(true);
    expect(result.current.failure).toBe(failure);
  },
);
