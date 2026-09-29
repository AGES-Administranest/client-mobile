import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import { useProcedureForm } from './useProcedureForm';
import { validProcedureForm } from '../domain/validProcedureForm.fixture';
import { createAppointment } from '../services/procedureService';

jest.mock('../services/procedureService', () => ({
  ...jest.requireActual('../services/procedureService'),
  createAppointment: jest.fn(),
}));
jest.mock('features/clients/services/clientService', () => ({
  fetchClients: jest.fn().mockResolvedValue([]),
}));
// A sessão entra pronta pelo AuthProvider; nada de auth pode ir à rede.
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const createAppointmentMock = createAppointment as jest.MockedFunction<
  typeof createAppointment
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

const VETCENTER = { id: 'client-7', name: 'Clínica VetCenter' };

async function mountHook(onSuccess: () => void = jest.fn(), visible = true) {
  const result = {
    current: null as unknown as ReturnType<typeof useProcedureForm>,
  };

  function Harness() {
    result.current = useProcedureForm(onSuccess, visible);
    return null;
  }

  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Harness />
      </AuthProvider>,
    );
  });

  return { result, onSuccess };
}

async function mountWithFilledForm(onSuccess: () => void = jest.fn()) {
  const mounted = await mountHook(onSuccess);
  await act(async () => {
    (
      Object.entries(validProcedureForm) as [
        keyof typeof validProcedureForm,
        string,
      ][]
    ).forEach(([key, value]) => mounted.result.current.setField(key, value));
  });
  return mounted;
}

async function submitSuccessfully(onSuccess: () => void = jest.fn()) {
  const mounted = await mountWithFilledForm(onSuccess);
  await act(async () => {
    await mounted.result.current.submit();
  });
  return mounted;
}

beforeEach(() => {
  jest.clearAllMocks();
  createAppointmentMock.mockResolvedValue({ id: 'appointment-1' } as never);
});

test('selecionar um tomador guarda o clientId e mostra o nome no campo', async () => {
  const { result } = await mountHook();

  await act(async () => result.current.client.onSelect(VETCENTER));

  expect(result.current.values.clientId).toBe('client-7');
  expect(result.current.client.term).toBe('Clínica VetCenter');
  expect(result.current.client.status).toBe('idle');
});

test('escolher o tomador não apaga o que já foi preenchido no formulário', async () => {
  const { result } = await mountHook();
  await act(async () => result.current.setTextField('patientName', 'Rex'));
  await act(async () => result.current.setTextField('amount', '350'));

  await act(async () => result.current.client.onSelect(VETCENTER));

  expect(result.current.values.patientName).toBe('Rex');
  expect(result.current.values.amount).toBe('350');
});

test('digitar depois de escolher desfaz o clientId', async () => {
  const { result } = await mountHook();
  await act(async () => result.current.client.onSelect(VETCENTER));

  await act(async () => result.current.client.onTermChange('Clínica Vet'));

  expect(result.current.values.clientId).toBeNull();
  expect(result.current.client.term).toBe('Clínica Vet');
});

test('enviar sem tomador escolhido marca o campo como obrigatório e não chama a API', async () => {
  const { result } = await mountHook();
  await act(async () => result.current.client.onTermChange('Clínica Vet'));

  await act(async () => {
    await result.current.submit();
  });

  expect(result.current.errors.clientId).toBe('REQUIRED');
  expect(createAppointmentMock).not.toHaveBeenCalled();
});

test('escolher o tomador limpa o erro de obrigatório do campo', async () => {
  const { result } = await mountHook();
  await act(async () => {
    await result.current.submit();
  });
  expect(result.current.errors.clientId).toBe('REQUIRED');

  await act(async () => result.current.client.onSelect(VETCENTER));

  expect(result.current.errors.clientId).toBeUndefined();
});

test('envia o clientId escolhido para a API', async () => {
  const { result } = await mountHook();
  for (const [key, value] of Object.entries(validProcedureForm)) {
    if (key !== 'clientId' && typeof value === 'string' && value !== '') {
      await act(async () =>
        result.current.setTextField(key as 'patientName', value),
      );
    }
  }
  await act(async () => result.current.setField('species', 'CANINE'));
  await act(async () => result.current.client.onSelect(VETCENTER));

  await act(async () => {
    await result.current.submit();
  });

  expect(createAppointmentMock).toHaveBeenCalledWith(
    'id-token',
    expect.objectContaining({ clientId: 'client-7' }),
  );
});

test('após salvar, o tomador e o termo voltam ao vazio', async () => {
  const { result } = await mountHook();
  await act(async () => result.current.client.onSelect(VETCENTER));

  await act(async () => result.current.reset());

  expect(result.current.values.clientId).toBeNull();
  expect(result.current.client.term).toBe('');
});

test('asks about supplies with the new appointment id instead of closing right away', async () => {
  const { result, onSuccess } = await submitSuccessfully();

  expect(result.current.supplyPrompt).toEqual({
    appointmentId: 'appointment-1',
    step: 'confirm',
  });
  expect(onSuccess).not.toHaveBeenCalled();
});

test('moves to the supply selector when the user accepts, keeping the appointment id', async () => {
  const { result, onSuccess } = await submitSuccessfully();

  await act(async () => result.current.acceptSupplyPrompt());

  expect(result.current.supplyPrompt).toEqual({
    appointmentId: 'appointment-1',
    step: 'selector',
  });
  expect(onSuccess).not.toHaveBeenCalled();
});

test('closes the form and clears it when the user declines, leaving the appointment saved', async () => {
  const { result, onSuccess } = await submitSuccessfully();

  await act(async () => result.current.finishSupplyPrompt());

  expect(result.current.supplyPrompt).toBeNull();
  expect(result.current.values.patientName).toBe('');
  expect(onSuccess).toHaveBeenCalledTimes(1);
  expect(createAppointmentMock).toHaveBeenCalledTimes(1);
});

test('does not ask about supplies when the appointment fails to save', async () => {
  createAppointmentMock.mockRejectedValue(new Error('network'));
  const { result, onSuccess } = await mountWithFilledForm();

  await act(async () => {
    await result.current.submit();
  });

  expect(result.current.supplyPrompt).toBeNull();
  expect(result.current.submitFailed).toBe(true);
  expect(onSuccess).not.toHaveBeenCalled();
});

// O fixture é de agosto de 2026, já passado; 2099 é sempre futuro.
const FUTURE_DATE = '06/08/2099';

async function submitScheduled(onSuccess: () => void = jest.fn()) {
  const mounted = await mountWithFilledForm(onSuccess);
  await act(async () => mounted.result.current.setField('date', FUTURE_DATE));
  await act(async () => {
    await mounted.result.current.submit();
  });
  return mounted;
}

test('com começo no futuro, salva como SCHEDULED e fecha sem perguntar de insumos', async () => {
  createAppointmentMock.mockResolvedValue({
    id: 'appointment-2',
    startsAt: '2099-08-06T12:00:00.000Z',
  } as never);

  const { result, onSuccess } = await submitScheduled();

  expect(createAppointmentMock).toHaveBeenCalledWith(
    'id-token',
    expect.objectContaining({ status: 'SCHEDULED' }),
  );
  expect(result.current.supplyPrompt).toBeNull();
  expect(onSuccess).toHaveBeenCalledWith({
    startsAt: '2099-08-06T12:00:00.000Z',
  });
  expect(result.current.values.patientName).toBe('');
});

test('um 409 de conflito de horário abre o alerta com o agendamento que ocupa o horário', async () => {
  const conflicting = {
    id: 'appointment-9',
    startsAt: '2099-08-06T12:30:00.000Z',
    endsAt: '2099-08-06T13:30:00.000Z',
    procedureName: 'Castração',
  };
  createAppointmentMock.mockRejectedValue(
    new ApiError('conflict', 'APPOINTMENT_TIME_CONFLICT', 409, {
      conflict: true,
      conflictingAppointment: conflicting,
    }),
  );

  const { result, onSuccess } = await submitScheduled();

  expect(result.current.conflict).toEqual(conflicting);
  expect(result.current.submitFailed).toBe(false);
  expect(onSuccess).not.toHaveBeenCalled();
});

test('ajustar o horário fecha o alerta e mantém o que foi digitado', async () => {
  createAppointmentMock.mockRejectedValue(
    new ApiError('conflict', 'APPOINTMENT_TIME_CONFLICT', 409, {
      conflict: true,
      conflictingAppointment: {
        id: 'appointment-9',
        startsAt: '2099-08-06T12:30:00.000Z',
        endsAt: '2099-08-06T13:30:00.000Z',
        procedureName: null,
      },
    }),
  );
  const { result } = await submitScheduled();

  await act(async () => result.current.dismissConflict());

  expect(result.current.conflict).toBeNull();
  expect(result.current.values.patientName).toBe('Rex');
  expect(result.current.values.date).toBe(FUTURE_DATE);
});

test('outro erro da API continua como falha genérica, sem alerta de conflito', async () => {
  createAppointmentMock.mockRejectedValue(
    new ApiError('bad', 'INVALID_REQUEST', 400),
  );

  const { result } = await submitScheduled();

  expect(result.current.conflict).toBeNull();
  expect(result.current.submitFailed).toBe(true);
});
