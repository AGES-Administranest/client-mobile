import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import type { Client } from 'features/clients';

import { useProcedureForm } from './useProcedureForm';
import { validProcedureForm } from '../domain/validProcedureForm.fixture';
import { createAppointment } from '../services/procedureService';

jest.mock('../services/procedureService', () => ({
  createAppointment: jest.fn(),
}));
jest.mock('features/clients/services/clientService', () => ({
  fetchClients: jest.fn().mockResolvedValue([]),
  createClient: jest.fn(),
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

test('um tomador recém-criado fica selecionado e preenche o campo', async () => {
  const { result } = await mountHook();
  await act(async () => result.current.setTextField('patientName', 'Rex'));

  await act(async () =>
    result.current.client.onCreated({
      id: 'client-new',
      name: 'Clínica Nova Vida',
    } as Client),
  );

  expect(result.current.values.clientId).toBe('client-new');
  expect(result.current.client.term).toBe('Clínica Nova Vida');
  expect(result.current.values.patientName).toBe('Rex');
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
