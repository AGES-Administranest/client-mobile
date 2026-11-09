import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  queueAppointmentCreate,
  queueAppointmentUpdate,
} from 'features/appointments';
import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import { useProcedureForm } from './useProcedureForm';
import { validProcedureForm } from '../domain/validProcedureForm.fixture';
import {
  createAppointment,
  updateAppointment,
  type AppointmentResult,
} from '../services/procedureService';

jest.mock('../services/procedureService', () => ({
  ...jest.requireActual('../services/procedureService'),
  createAppointment: jest.fn(),
  updateAppointment: jest.fn(),
}));
jest.mock('features/appointments', () => ({
  ...jest.requireActual('features/appointments'),
  newClientGeneratedId: () => 'cg-1',
  queueAppointmentCreate: jest.fn().mockResolvedValue(undefined),
  queueAppointmentUpdate: jest.fn().mockResolvedValue(undefined),
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

const VETCENTER_WITH_ADDRESS = {
  ...VETCENTER,
  addressLine: 'Rua das Hortênsias, 340 — Jardim Europa',
  city: 'São Paulo',
  state: 'SP',
};
const VETCENTER_ADDRESS =
  'Rua das Hortênsias, 340 — Jardim Europa, São Paulo, SP';

const OTHER_CLINIC_WITH_ADDRESS = {
  id: 'client-8',
  name: 'Clínica Outra',
  addressLine: 'Av. Ipiranga, 1200',
  city: 'Porto Alegre',
  state: 'RS',
};
const OTHER_CLINIC_ADDRESS = 'Av. Ipiranga, 1200, Porto Alegre, RS';

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

test('enviar sem tomador escolhido da lista pede para escolher uma clínica e não chama a API', async () => {
  const { result } = await mountHook();
  await act(async () => result.current.client.onTermChange('Clínica Vet'));

  await act(async () => {
    await result.current.submit();
  });

  expect(result.current.errors.clientId).toBe('SELECT_CLIENT');
  expect(createAppointmentMock).not.toHaveBeenCalled();
});

test('escolher o tomador limpa o erro do campo', async () => {
  const { result } = await mountHook();
  await act(async () => {
    await result.current.submit();
  });
  expect(result.current.errors.clientId).toBe('SELECT_CLIENT');

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

describe('sem conexão', () => {
  const offline = () => new TypeError('Network request failed');

  test('o create vai para a fila com o clientGeneratedId e o formulário fecha', async () => {
    createAppointmentMock.mockRejectedValue(offline());

    const { result, onSuccess } = await submitScheduled();

    expect(createAppointmentMock).toHaveBeenCalledWith(
      'id-token',
      expect.objectContaining({ clientGeneratedId: 'cg-1' }),
    );
    expect(queueAppointmentCreate).toHaveBeenCalledWith(
      'user-1',
      'cg-1',
      expect.objectContaining({ status: 'SCHEDULED', patientName: 'Rex' }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.submitFailed).toBe(false);
    expect(result.current.supplyPrompt).toBeNull();
  });

  test('procedimento já realizado criado offline também não pergunta de insumos', async () => {
    createAppointmentMock.mockRejectedValue(offline());

    const { result, onSuccess } = await submitSuccessfully();

    expect(queueAppointmentCreate).toHaveBeenCalledWith(
      'user-1',
      'cg-1',
      expect.objectContaining({ status: 'COMPLETED' }),
    );
    expect(result.current.supplyPrompt).toBeNull();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  test('com uma clínica cadastrada offline, nem tenta a rede: vai direto para a fila', async () => {
    const { result, onSuccess } = await mountWithFilledForm();
    await act(async () =>
      result.current.client.onSelect({
        id: 'local:clinic-1',
        name: 'Clínica Casa',
      }),
    );
    await act(async () => result.current.setField('date', FUTURE_DATE));
    await act(async () => {
      await result.current.submit();
    });

    expect(createAppointmentMock).not.toHaveBeenCalled();
    expect(queueAppointmentCreate).toHaveBeenCalledWith(
      'user-1',
      'cg-1',
      expect.objectContaining({ clientId: 'local:clinic-1' }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  test('um erro da API com rede não entra na fila', async () => {
    createAppointmentMock.mockRejectedValue(
      new ApiError('bad', 'INVALID_REQUEST', 400),
    );

    await submitScheduled();

    expect(queueAppointmentCreate).not.toHaveBeenCalled();
  });

  const EDITING = {
    id: 'server-1',
    clientId: 'client-1',
    ownerName: null,
    procedureName: 'Orquiectomia',
    startsAt: new Date(2026, 7, 6, 9, 0).toISOString(),
    endsAt: new Date(2026, 7, 6, 10, 0).toISOString(),
    patientName: 'Rex',
    amount: '350.00',
    status: 'COMPLETED',
  } as unknown as AppointmentResult;

  async function submitEdit(editing: AppointmentResult) {
    const result = {
      current: null as unknown as ReturnType<typeof useProcedureForm>,
    };
    const onSuccess = jest.fn();
    function Harness() {
      result.current = useProcedureForm(onSuccess, true, editing);
      return null;
    }
    await act(async () => {
      ReactTestRenderer.create(
        <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
          <Harness />
        </AuthProvider>,
      );
    });
    await act(async () => {
      (
        Object.entries(validProcedureForm) as [
          keyof typeof validProcedureForm,
          string,
        ][]
      ).forEach(([key, value]) => result.current.setField(key, value));
    });
    await act(async () => {
      await result.current.submit();
    });
    return { result, onSuccess };
  }

  test('a edição sem rede vai para a fila e fecha como se tivesse salvo', async () => {
    (updateAppointment as jest.Mock).mockRejectedValue(offline());

    const { onSuccess } = await submitEdit(EDITING);

    expect(queueAppointmentUpdate).toHaveBeenCalledWith(
      'user-1',
      'server-1',
      expect.not.objectContaining({ status: expect.anything() }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  test('editar um agendamento criado offline nem tenta a rede', async () => {
    const { onSuccess } = await submitEdit({
      ...EDITING,
      id: 'local:cg-9',
    });

    expect(updateAppointment).not.toHaveBeenCalled();
    expect(queueAppointmentUpdate).toHaveBeenCalledWith(
      'user-1',
      'local:cg-9',
      expect.any(Object),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});

describe('sugestão de local pelo endereço do tomador', () => {
  test('escolher um tomador com endereço preenche o local e mostra o hint', async () => {
    const { result } = await mountHook();

    await act(async () =>
      result.current.client.onSelect(VETCENTER_WITH_ADDRESS),
    );

    expect(result.current.values.location).toBe(VETCENTER_ADDRESS);
    expect(result.current.showLocationHint).toBe(true);
  });

  test('tomador sem endereço não preenche o local nem mostra o hint', async () => {
    const { result } = await mountHook();

    await act(async () => result.current.client.onSelect(VETCENTER));

    expect(result.current.values.location).toBe('');
    expect(result.current.showLocationHint).toBe(false);
  });

  test('trocar de tomador troca a sugestão se o local não foi editado', async () => {
    const { result } = await mountHook();
    await act(async () =>
      result.current.client.onSelect(VETCENTER_WITH_ADDRESS),
    );

    await act(async () =>
      result.current.client.onSelect(OTHER_CLINIC_WITH_ADDRESS),
    );

    expect(result.current.values.location).toBe(OTHER_CLINIC_ADDRESS);
    expect(result.current.showLocationHint).toBe(true);
  });

  test('trocar de tomador mantém o local que o usuário editou e esconde o hint', async () => {
    const { result } = await mountHook();
    await act(async () =>
      result.current.client.onSelect(VETCENTER_WITH_ADDRESS),
    );
    await act(async () =>
      result.current.setTextField('location', 'Sala 2 da clínica'),
    );
    expect(result.current.showLocationHint).toBe(false);

    await act(async () =>
      result.current.client.onSelect(OTHER_CLINIC_WITH_ADDRESS),
    );

    expect(result.current.values.location).toBe('Sala 2 da clínica');
    expect(result.current.showLocationHint).toBe(false);
  });

  test('um local digitado antes de escolher o tomador não é sobrescrito', async () => {
    const { result } = await mountHook();
    await act(async () =>
      result.current.setTextField('location', 'Consultório do Dr. João'),
    );

    await act(async () =>
      result.current.client.onSelect(VETCENTER_WITH_ADDRESS),
    );

    expect(result.current.values.location).toBe('Consultório do Dr. João');
  });

  test('apagar o local e escolher outro tomador volta a sugerir', async () => {
    const { result } = await mountHook();
    await act(async () =>
      result.current.client.onSelect(VETCENTER_WITH_ADDRESS),
    );
    await act(async () => result.current.setTextField('location', ''));

    await act(async () =>
      result.current.client.onSelect(OTHER_CLINIC_WITH_ADDRESS),
    );

    expect(result.current.values.location).toBe(OTHER_CLINIC_ADDRESS);
  });

  test('editar o local não altera o tomador escolhido', async () => {
    const { result } = await mountHook();
    await act(async () =>
      result.current.client.onSelect(VETCENTER_WITH_ADDRESS),
    );

    await act(async () =>
      result.current.setTextField('location', 'Outro endereço'),
    );

    expect(result.current.values.clientId).toBe('client-7');
    expect(result.current.client.term).toBe('Clínica VetCenter');
  });

  test('o reset limpa o local e a sugestão', async () => {
    const { result } = await mountHook();
    await act(async () =>
      result.current.client.onSelect(VETCENTER_WITH_ADDRESS),
    );

    await act(async () => result.current.reset());

    expect(result.current.values.location).toBe('');
    expect(result.current.showLocationHint).toBe(false);
  });

  test('envia o local sugerido para a API', async () => {
    const { result } = await mountWithFilledForm();
    await act(async () =>
      result.current.client.onSelect(VETCENTER_WITH_ADDRESS),
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(createAppointmentMock).toHaveBeenCalledWith(
      'id-token',
      expect.objectContaining({
        clientId: 'client-7',
        location: VETCENTER_ADDRESS,
      }),
    );
  });
});

describe('cadastro de novo tomador a partir do formulário', () => {
  const CREATED = {
    id: 'client-new',
    name: 'Clínica Nova',
    addressLine: 'Rua Augusta, 1500',
    city: 'São Paulo',
    state: 'SP',
  };
  const CREATED_ADDRESS = 'Rua Augusta, 1500, São Paulo, SP';

  async function startRegistration() {
    const mounted = await mountHook();
    const { result } = mounted;
    await act(async () => result.current.setTextField('patientName', 'Rex'));
    await act(async () => result.current.setTextField('amount', '350'));
    await act(async () => result.current.client.onTermChange('Clínica Nova'));
    await act(async () => result.current.client.onRegister());
    return mounted;
  }

  test('abrir o cadastro esconde o formulário, leva o nome digitado e não perde nada', async () => {
    const { result } = await startRegistration();

    expect(result.current.registration.isHidingForm).toBe(true);
    // Só abre quando o formulário terminou de sair (iOS).
    expect(result.current.registration.isOpen).toBe(false);
    expect(result.current.registration.initialName).toBe('Clínica Nova');
    expect(result.current.values.patientName).toBe('Rex');
    expect(result.current.values.amount).toBe('350');

    await act(async () => result.current.registration.onFormClosed());

    expect(result.current.registration.isOpen).toBe(true);
    expect(result.current.registration.isHidingForm).toBe(true);
  });

  test('cadastrar seleciona o tomador, sugere o local e volta com os campos preservados', async () => {
    const { result } = await startRegistration();
    await act(async () => result.current.registration.onFormClosed());

    await act(async () => result.current.registration.onCreated(CREATED));

    expect(result.current.values.clientId).toBe('client-new');
    expect(result.current.client.term).toBe('Clínica Nova');
    expect(result.current.values.location).toBe(CREATED_ADDRESS);
    expect(result.current.showLocationHint).toBe(true);
    // O formulário só volta quando o cadastro terminou de sair.
    expect(result.current.registration.isHidingForm).toBe(true);

    await act(async () => result.current.registration.onClosed());

    expect(result.current.registration.isHidingForm).toBe(false);
    expect(result.current.registration.isOpen).toBe(false);
    expect(result.current.values.patientName).toBe('Rex');
    expect(result.current.values.amount).toBe('350');
    expect(result.current.values.clientId).toBe('client-new');
  });

  test('cancelar volta ao formulário intacto, sem tomador selecionado', async () => {
    const { result } = await startRegistration();
    await act(async () => result.current.registration.onFormClosed());

    await act(async () => result.current.registration.cancel());
    await act(async () => result.current.registration.onClosed());

    expect(result.current.registration.isHidingForm).toBe(false);
    expect(result.current.values.clientId).toBeNull();
    expect(result.current.values.patientName).toBe('Rex');
    expect(result.current.values.amount).toBe('350');
    expect(result.current.client.term).toBe('Clínica Nova');
  });

  test('o reset durante o cadastro não deixa o formulário preso escondido', async () => {
    const { result } = await startRegistration();

    await act(async () => result.current.reset());

    expect(result.current.registration.isHidingForm).toBe(false);
    expect(result.current.registration.isOpen).toBe(false);
  });

  test('tomador criado sem rede (id local) segue direto para a fila', async () => {
    const { result, onSuccess } = await mountWithFilledForm();
    await act(async () => result.current.setField('date', FUTURE_DATE));
    await act(async () => result.current.client.onTermChange('Clínica Nova'));
    await act(async () => result.current.client.onRegister());
    await act(async () => result.current.registration.onFormClosed());
    await act(async () =>
      result.current.registration.onCreated({
        ...CREATED,
        id: 'local:clinic-9',
      }),
    );
    await act(async () => result.current.registration.onClosed());

    await act(async () => {
      await result.current.submit();
    });

    expect(createAppointmentMock).not.toHaveBeenCalled();
    expect(queueAppointmentCreate).toHaveBeenCalledWith(
      'user-1',
      'cg-1',
      expect.objectContaining({ clientId: 'local:clinic-9' }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
