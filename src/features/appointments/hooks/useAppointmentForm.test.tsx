import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import {
  useAppointmentForm,
  type AppointmentFormState,
} from './useAppointmentForm';
import { createDraft, type Appointment } from '../domain/appointment';
import {
  createAppointment,
  updateAppointment,
} from '../services/appointmentService';

jest.mock('../services/appointmentService', () => ({
  ...jest.requireActual('../services/appointmentService'),
  createAppointment: jest.fn(),
  updateAppointment: jest.fn(),
}));
jest.mock('../services/serviceTakerService', () => ({
  fetchServiceTakers: jest.fn(() => Promise.resolve([])),
}));
// A sessão entra pronta pelo AuthProvider; nada de auth pode ir à rede.
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const createMock = createAppointment as jest.MockedFunction<
  typeof createAppointment
>;
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
  name: 'Gabriel',
  email: 'gabriel@example.com',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

const SAVED: Appointment = {
  id: 'appointment-1',
  clientId: 'client-1',
  patientName: 'Mel',
  procedureName: 'Orquiectomia',
  startsAt: new Date(2026, 8, 21, 8, 30).toISOString(),
  endsAt: new Date(2026, 8, 21, 10, 0).toISOString(),
  amount: '620.00',
  species: 'CANINE',
  patientAgeYears: null,
  weightKg: null,
  asaClass: null,
  notes: null,
};

const CONFLICTING = {
  id: 'appointment-0',
  startsAt: new Date(2026, 8, 21, 9, 0).toISOString(),
  endsAt: new Date(2026, 8, 21, 11, 0).toISOString(),
  procedureName: 'Castração',
};

async function mountHook(appointmentId: string | null = null) {
  const state: { current: AppointmentFormState | null } = { current: null };

  function Harness() {
    state.current = useAppointmentForm(appointmentId);
    return null;
  }

  // async: a lista de tomadores resolve depois da montagem.
  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Harness />
      </AuthProvider>,
    );
  });

  return {
    get form() {
      return state.current!;
    },
  };
}

async function fillValidDraft(hook: { form: AppointmentFormState }) {
  await act(() => {
    hook.form.reset(createDraft('2026-09-21'));
  });
  await act(() => {
    hook.form.setStartTime('0830');
    hook.form.setEndTime('1000');
    hook.form.setClientId('client-1');
    hook.form.setPatientName('Mel');
    hook.form.setProcedureName('Orquiectomia');
    hook.form.setAmount('62000');
  });
}

beforeEach(() => {
  createMock.mockReset();
  updateMock.mockReset();
});

test('só considera o rascunho alterado depois que algo muda', async () => {
  const hook = await mountHook();

  await act(() => {
    hook.form.reset(createDraft('2026-09-21'));
  });
  expect(hook.form.isDirty).toBe(false);
  expect(hook.form.draft.date).toBe('21/09/2026');

  await act(() => {
    hook.form.setNotes('Jejum de 8h');
  });
  expect(hook.form.isDirty).toBe(true);
});

test('não chama a API com o formulário inválido', async () => {
  const hook = await mountHook();

  await act(() => {
    hook.form.reset(createDraft('2026-09-21'));
  });

  let result: Appointment | null = SAVED;
  await act(async () => {
    result = await hook.form.submit();
  });

  expect(result).toBeNull();
  expect(createMock).not.toHaveBeenCalled();
  expect(hook.form.errors.patientName).toBe('required');
});

test('cria no modo de criação, com o token da sessão', async () => {
  createMock.mockResolvedValue(SAVED);
  const hook = await mountHook(null);
  await fillValidDraft(hook);

  let result: Appointment | null = null;
  await act(async () => {
    result = await hook.form.submit();
  });

  expect(result).toBe(SAVED);
  expect(updateMock).not.toHaveBeenCalled();
  expect(createMock).toHaveBeenCalledWith(
    'id-token',
    expect.objectContaining({ clientId: 'client-1', amount: 620 }),
    {},
  );
});

test('atualiza no modo de edição', async () => {
  updateMock.mockResolvedValue(SAVED);
  const hook = await mountHook('appointment-1');
  await fillValidDraft(hook);

  await act(async () => {
    await hook.form.submit();
  });

  expect(createMock).not.toHaveBeenCalled();
  expect(updateMock).toHaveBeenCalledWith(
    'id-token',
    'appointment-1',
    expect.objectContaining({ patientName: 'Mel' }),
    {},
  );
});

test('um 409 vira conflito, e confirmar reenvia forçando', async () => {
  createMock.mockRejectedValueOnce(
    new ApiError('conflict', 'APPOINTMENT_TIME_CONFLICT', 409, {
      conflict: true,
      conflictingAppointment: CONFLICTING,
    }),
  );
  createMock.mockResolvedValueOnce(SAVED);
  const hook = await mountHook();
  await fillValidDraft(hook);

  await act(async () => {
    await hook.form.submit();
  });

  expect(hook.form.conflict).toEqual(CONFLICTING);
  expect(hook.form.failure).toBeNull();

  let result: Appointment | null = null;
  await act(async () => {
    result = await hook.form.confirmDespiteConflict();
  });

  expect(result).toBe(SAVED);
  expect(createMock).toHaveBeenLastCalledWith('id-token', expect.anything(), {
    force: true,
  });
  expect(hook.form.conflict).toBeNull();
});

test('ajustar o horário só fecha o conflito', async () => {
  createMock.mockRejectedValueOnce(
    new ApiError('conflict', 'APPOINTMENT_TIME_CONFLICT', 409, {
      conflict: true,
      conflictingAppointment: CONFLICTING,
    }),
  );
  const hook = await mountHook();
  await fillValidDraft(hook);

  await act(async () => {
    await hook.form.submit();
  });
  await act(() => {
    hook.form.dismissConflict();
  });

  expect(hook.form.conflict).toBeNull();
  expect(createMock).toHaveBeenCalledTimes(1);
});

test('outro erro da API vira falha genérica, não conflito', async () => {
  createMock.mockRejectedValueOnce(new ApiError('boom', 'UNKNOWN', 500));
  const hook = await mountHook();
  await fillValidDraft(hook);

  await act(async () => {
    await hook.form.submit();
  });

  expect(hook.form.conflict).toBeNull();
  expect(hook.form.failure).toEqual({ code: 'UNKNOWN' });
});
