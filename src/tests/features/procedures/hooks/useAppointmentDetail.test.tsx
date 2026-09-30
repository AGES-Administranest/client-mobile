import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  findOfflineAppointment,
  resolveLocalAppointmentId,
} from 'features/appointments';
import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { useAppointmentDetail } from 'features/procedures/hooks/useAppointmentDetail';
import {
  fetchAppointmentSupplies,
  registerAppointmentSupplies,
  removeAppointmentSupply,
} from 'features/procedures/services/appointmentSupplyService';
import {
  fetchAppointment,
  updateAppointmentAmount,
  type AppointmentResult,
} from 'features/procedures/services/procedureService';

jest.mock('features/procedures/services/procedureService', () => ({
  fetchAppointment: jest.fn(),
  updateAppointmentAmount: jest.fn(),
}));
jest.mock('features/procedures/services/appointmentSupplyService', () => ({
  fetchAppointmentSupplies: jest.fn(),
  registerAppointmentSupplies: jest.fn(),
  removeAppointmentSupply: jest.fn(),
}));
jest.mock('features/appointments', () => ({
  ...jest.requireActual('features/appointments'),
  findOfflineAppointment: jest.fn(),
  resolveLocalAppointmentId: jest.fn(),
}));
// A sessão entra pronta pelo AuthProvider; nada de auth pode ir à rede.
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const fetchAppointmentMock = jest.mocked(fetchAppointment);
const updateAmountMock = jest.mocked(updateAppointmentAmount);
const fetchSuppliesMock = jest.mocked(fetchAppointmentSupplies);
const registerMock = jest.mocked(registerAppointmentSupplies);
const removeMock = jest.mocked(removeAppointmentSupply);
const findOfflineMock = jest.mocked(findOfflineAppointment);
const resolveLocalMock = jest.mocked(resolveLocalAppointmentId);

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

const APPOINTMENT = {
  id: 'appointment-1',
  status: 'SCHEDULED',
  amount: null,
  startsAt: '2026-09-28T13:00:00.000Z',
} as AppointmentResult;

const PROPOFOL = {
  id: 'movement-1',
  itemId: 'item-1',
  quantity: '2.000',
  unitCost: '19.9000',
  item: { name: 'Propofol', unit: 'VIAL' },
};

async function mountHook(appointmentId = 'appointment-1') {
  const result = {
    current: null as unknown as ReturnType<typeof useAppointmentDetail>,
  };

  function Harness() {
    result.current = useAppointmentDetail(appointmentId);
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
  jest.resetAllMocks();
  fetchAppointmentMock.mockResolvedValue(APPOINTMENT);
  fetchSuppliesMock.mockResolvedValue([PROPOFOL]);
  registerMock.mockResolvedValue();
  removeMock.mockResolvedValue();
  resolveLocalMock.mockResolvedValue(null);
});

test('loads the appointment and its saved supplies', async () => {
  const result = await mountHook();

  expect(result.current.status).toBe('ready');
  expect(result.current.appointment).toBe(APPOINTMENT);
  expect(result.current.supplies).toEqual([
    { id: 'movement-1', name: 'Propofol', quantity: 2, unitCost: 19.9 },
  ]);
});

test('shows an error when the appointment cannot be loaded', async () => {
  fetchAppointmentMock.mockRejectedValue(new Error('offline'));

  const result = await mountHook();

  expect(result.current.status).toBe('error');
});

test('sem rede, mostra o agendamento salvo no aparelho, sem insumos', async () => {
  fetchAppointmentMock.mockRejectedValue(
    new TypeError('Network request failed'),
  );
  findOfflineMock.mockResolvedValue({
    id: 'appointment-1',
    patientName: 'Thomas',
    startsAt: '2026-09-30T18:00:00.000Z',
    endsAt: '2026-09-30T19:00:00.000Z',
    amount: 200,
    status: 'SCHEDULED',
  });

  const result = await mountHook();

  expect(findOfflineMock).toHaveBeenCalledWith('user-1', 'appointment-1');
  expect(result.current.status).toBe('ready');
  expect(result.current.appointment).toMatchObject({
    id: 'appointment-1',
    patientName: 'Thomas',
    amount: '200',
  });
  expect(result.current.supplies).toEqual([]);
});

test('sem rede e sem nada salvo, continua mostrando o erro', async () => {
  fetchAppointmentMock.mockRejectedValue(
    new TypeError('Network request failed'),
  );
  findOfflineMock.mockResolvedValue(null);

  const result = await mountHook();

  expect(result.current.status).toBe('error');
});

test('criado offline e ainda na fila, vem do aparelho sem ir ao backend', async () => {
  findOfflineMock.mockResolvedValue({
    id: 'local:cg-1',
    startsAt: '2026-09-30T18:00:00.000Z',
    status: 'SCHEDULED',
  });

  const result = await mountHook('local:cg-1');

  expect(findOfflineMock).toHaveBeenCalledWith('user-1', 'local:cg-1');
  expect(fetchAppointmentMock).not.toHaveBeenCalled();
  expect(result.current.status).toBe('ready');
});

test('criado offline e já sincronizado, vem do backend pelo id real', async () => {
  resolveLocalMock.mockResolvedValue('appointment-1');

  const result = await mountHook('local:cg-1');

  expect(resolveLocalMock).toHaveBeenCalledWith('user-1', 'local:cg-1');
  expect(fetchAppointmentMock).toHaveBeenCalledWith(
    'id-token',
    'appointment-1',
  );
  expect(findOfflineMock).not.toHaveBeenCalled();
  expect(result.current.status).toBe('ready');

  await act(async () => {
    await result.current.addSupply('item-1', 1);
  });
  expect(registerMock).toHaveBeenCalledWith('id-token', 'appointment-1', [
    { itemId: 'item-1', quantity: 1 },
  ]);
});

test('adding a supply saves it and reloads the list from the server', async () => {
  const result = await mountHook();
  fetchSuppliesMock.mockResolvedValue([
    PROPOFOL,
    { ...PROPOFOL, id: 'movement-2', item: { name: 'Seringa', unit: 'UNIT' } },
  ]);

  let saved = false;
  await act(async () => {
    saved = await result.current.addSupply('item-2', 1);
  });

  expect(saved).toBe(true);
  expect(registerMock).toHaveBeenCalledWith('id-token', 'appointment-1', [
    { itemId: 'item-2', quantity: 1 },
  ]);
  expect(result.current.supplies.map(s => s.name)).toEqual([
    'Propofol',
    'Seringa',
  ]);
  expect(result.current.supplyFailed).toBe(false);
});

test('a failed save keeps the list and flags the failure', async () => {
  const result = await mountHook();
  registerMock.mockRejectedValue(new Error('offline'));

  let saved = true;
  await act(async () => {
    saved = await result.current.addSupply('item-2', 1);
  });

  expect(saved).toBe(false);
  expect(result.current.supplyFailed).toBe(true);
  expect(result.current.supplies).toHaveLength(1);
});

test('removing a supply deletes it by movement id and reloads', async () => {
  const result = await mountHook();
  fetchSuppliesMock.mockResolvedValue([]);

  await act(async () => {
    await result.current.removeSupply('movement-1');
  });

  expect(removeMock).toHaveBeenCalledWith(
    'id-token',
    'appointment-1',
    'movement-1',
  );
  expect(result.current.supplies).toEqual([]);
});

describe('saveAmount', () => {
  it.each([
    ['', 'REQUIRED'],
    ['abc', 'INVALID_NUMBER'],
    ['-5', 'INVALID_NUMBER'],
  ])('rejects %p without calling the API', async (text, expected) => {
    const result = await mountHook();

    let error: string | null = null;
    await act(async () => {
      error = await result.current.saveAmount(text);
    });

    expect(error).toBe(expected);
    expect(updateAmountMock).not.toHaveBeenCalled();
  });

  it('accepts a comma as decimal separator and shows the updated amount', async () => {
    updateAmountMock.mockResolvedValue({ ...APPOINTMENT, amount: '350.50' });
    const result = await mountHook();

    let error: string | null = 'unset';
    await act(async () => {
      error = await result.current.saveAmount('350,50');
    });

    expect(error).toBeNull();
    expect(updateAmountMock).toHaveBeenCalledWith(
      'id-token',
      'appointment-1',
      350.5,
    );
    expect(result.current.appointment?.amount).toBe('350.50');
  });

  it('answers FAILED when the API refuses', async () => {
    updateAmountMock.mockRejectedValue(new Error('offline'));
    const result = await mountHook();

    let error: string | null = null;
    await act(async () => {
      error = await result.current.saveAmount('10');
    });

    expect(error).toBe('FAILED');
  });
});
