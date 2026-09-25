import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import type { Client } from 'features/clients';

import { useProcedureForm } from './useProcedureForm';
import { buildAppointment } from '../domain/appointment.fixture';
import { validProcedureForm } from '../domain/validProcedureForm.fixture';
import {
  createAppointment,
  updateAppointment,
} from '../services/procedureService';

jest.mock('../services/procedureService', () => ({
  createAppointment: jest.fn(),
  updateAppointment: jest.fn(),
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

const updateAppointmentMock = updateAppointment as jest.MockedFunction<
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

beforeEach(() => {
  jest.clearAllMocks();
  createAppointmentMock.mockResolvedValue({} as never);
  updateAppointmentMock.mockResolvedValue({} as never);
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
  const { result, onSuccess } = await mountHook();
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
  expect(onSuccess).toHaveBeenCalled();
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

const EDITING = {
  appointment: buildAppointment({ id: 'appointment-9', notes: 'Jejum' }),
  clientName: 'Clínica VetCenter',
};

test('o envio de um cadastro novo marca o atendimento como COMPLETED', async () => {
  const { result } = await mountHook();
  await act(async () => result.current.begin(EDITING));
  await act(async () => result.current.begin(null));
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
    expect.objectContaining({ status: 'COMPLETED' }),
  );
  expect(updateAppointmentMock).not.toHaveBeenCalled();
});

describe('modo edição', () => {
  test('preenche o formulário com o atendimento, na forma que se digita', async () => {
    const { result } = await mountHook();

    await act(async () => result.current.begin(EDITING));

    expect(result.current.isEditing).toBe(true);
    expect(result.current.values).toEqual({
      ...validProcedureForm,
      notes: 'Jejum',
    });
  });

  test('abre com o tomador atual escolhido: nome no campo e busca pausada', async () => {
    const { result } = await mountHook();

    await act(async () => result.current.begin(EDITING));

    expect(result.current.values.clientId).toBe('client-1');
    expect(result.current.client.term).toBe('Clínica VetCenter');
    expect(result.current.client.status).toBe('idle');
    expect(result.current.client.options).toEqual([]);
  });

  test('digitar no campo do tomador desfaz a escolha, como no cadastro', async () => {
    const { result } = await mountHook();
    await act(async () => result.current.begin(EDITING));

    await act(async () => result.current.client.onTermChange('Hospital'));

    expect(result.current.values.clientId).toBeNull();
    expect(result.current.client.term).toBe('Hospital');
  });

  test('registro antigo, sem nome de tomador, abre com o campo vazio e exige escolher', async () => {
    const { result } = await mountHook();
    await act(async () =>
      result.current.begin({
        appointment: buildAppointment({ clientId: null, location: 'Antiga' }),
        clientName: 'Antiga',
      }),
    );

    expect(result.current.values.clientId).toBeNull();
    expect(result.current.client.term).toBe('');

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.errors.clientId).toBe('REQUIRED');
    expect(updateAppointmentMock).not.toHaveBeenCalled();
  });

  test('tomador cadastrado mas ainda sem nome carregado não deixa clientId apontando para um campo vazio', async () => {
    const { result } = await mountHook();

    await act(async () =>
      result.current.begin({ ...EDITING, clientName: null }),
    );

    expect(result.current.values.clientId).toBeNull();
    expect(result.current.client.term).toBe('');
  });

  test('salvar chama updateAppointment com o id, sem status, e fecha', async () => {
    const { result, onSuccess } = await mountHook();
    await act(async () => result.current.begin(EDITING));
    await act(async () => result.current.setTextField('amount', '500'));

    await act(async () => {
      await result.current.submit();
    });

    expect(updateAppointmentMock).toHaveBeenCalledTimes(1);
    const [token, id, payload] = updateAppointmentMock.mock.calls[0];
    expect(token).toBe('id-token');
    expect(id).toBe('appointment-9');
    expect(payload).toMatchObject({
      amount: 500,
      clientId: 'client-1',
      notes: 'Jejum',
    });
    expect(payload).not.toHaveProperty('status');
    expect(createAppointmentMock).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  test('a edição passa pela mesma validação do cadastro', async () => {
    const { result } = await mountHook();
    await act(async () => result.current.begin(EDITING));
    await act(async () => result.current.setTextField('amount', '0'));

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.errors.amount).toBe('MUST_BE_POSITIVE');
    expect(updateAppointmentMock).not.toHaveBeenCalled();
  });

  test('falha ao salvar a edição mantém o formulário e avisa', async () => {
    updateAppointmentMock.mockRejectedValue(new Error('rede'));
    const { result, onSuccess } = await mountHook();
    await act(async () => result.current.begin(EDITING));

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.submitFailed).toBe(true);
    expect(result.current.values.patientName).toBe('Rex');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  test('abrir outro atendimento limpa erros e falha da edição anterior', async () => {
    updateAppointmentMock.mockRejectedValue(new Error('rede'));
    const { result } = await mountHook();
    await act(async () => result.current.begin(EDITING));
    await act(async () => {
      await result.current.submit();
    });

    await act(async () =>
      result.current.begin({
        appointment: buildAppointment({
          id: 'appointment-10',
          patientName: 'Mel',
        }),
        clientName: 'Clínica VetCenter',
      }),
    );

    expect(result.current.submitFailed).toBe(false);
    expect(result.current.values.patientName).toBe('Mel');
  });

  test('após salvar, o título continua de edição até o sheet fechar', async () => {
    const { result } = await mountHook();
    await act(async () => result.current.begin(EDITING));

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.isEditing).toBe(true);
    expect(result.current.values.patientName).toBe('');
  });

  test('novo cadastro depois de uma edição começa vazio, sem sobras', async () => {
    const { result } = await mountHook();
    await act(async () => result.current.begin(EDITING));

    await act(async () => result.current.begin(null));

    expect(result.current.isEditing).toBe(false);
    expect(result.current.values.patientName).toBe('');
    expect(result.current.values.clientId).toBeNull();
    expect(result.current.client.term).toBe('');
  });

  test('novo cadastro sem edição antes preserva o rascunho', async () => {
    const { result } = await mountHook();
    await act(async () => result.current.setTextField('patientName', 'Rex'));

    await act(async () => result.current.begin(null));

    expect(result.current.values.patientName).toBe('Rex');
  });
});
