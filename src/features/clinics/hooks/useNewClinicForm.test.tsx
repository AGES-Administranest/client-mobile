import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AuthProvider,
  TERMS_VERSION,
  type Account,
  type AuthSession,
} from 'features/auth';
import { loadClientOutbox } from 'features/clients';
import { ApiError } from 'shared/services/apiClient';

import { useNewClinicForm } from './useNewClinicForm';
import type { Client } from '../domain/client';
import { EMPTY_CLINIC_DRAFT } from '../domain/clinicForm';
import { createClient } from '../services/clientService';

jest.mock('../services/clientService', () => ({
  createClient: jest.fn(),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'uuid-1' }));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const createClientMock = createClient as jest.MockedFunction<
  typeof createClient
>;

const SESSION: AuthSession = {
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

const CREATED: Client = {
  id: 'client-1',
  type: 'CLINIC',
  name: 'Clínica VetNova',
  taxId: '11222333000181',
  taxIdType: 'CNPJ',
  contactName: null,
  email: null,
  phone: '1134567890',
  addressLine: null,
  city: null,
  state: null,
  serviceDays: [],
  paymentTermsDays: null,
  preferredPaymentMethod: null,
  active: true,
  createdAt: '2026-09-23T12:00:00.000Z',
  updatedAt: '2026-09-23T12:00:00.000Z',
};

let current: ReturnType<typeof useNewClinicForm>;

function Probe() {
  current = useNewClinicForm();
  return null;
}

async function mount(session: AuthSession | null = SESSION) {
  await act(async () => {
    ReactTestRenderer.create(
      <AuthProvider
        initialSession={session}
        initialAccount={session ? ACCOUNT : null}
      >
        <Probe />
      </AuthProvider>,
    );
  });
}

const VALID_FIELDS = {
  cnpj: '11.222.333/0001-81',
  addressLine: 'Rua das Hortênsias, 340',
  city: 'São Paulo',
  state: 'SP',
  phone: '(11) 3456-7890',
  email: 'contato@vetnova.com.br',
  contactName: 'Dr. André Matos',
} as const;

async function fillName(name = 'Clínica VetNova') {
  await act(async () => {
    current.setField('name', name);
    for (const [field, value] of Object.entries(VALID_FIELDS)) {
      current.setField(field as keyof typeof VALID_FIELDS, value);
    }
  });
}

beforeEach(() => {
  createClientMock.mockReset().mockResolvedValue(CREATED);
});

test('starts with an empty form', async () => {
  await mount();

  expect(current.draft).toEqual(EMPTY_CLINIC_DRAFT);
  expect(current.errors).toEqual({});
  expect(current.failure).toBeNull();
  expect(current.isSaving).toBe(false);
});

test('masks the CNPJ, the phone and the state as they are typed', async () => {
  await mount();

  await act(async () => {
    current.setField('cnpj', '11222333000181');
    current.setField('phone', '11934567890');
    current.setField('state', 'sp');
  });

  expect(current.draft.cnpj).toBe('11.222.333/0001-81');
  expect(current.draft.phone).toBe('(11) 93456-7890');
  expect(current.draft.state).toBe('SP');
});

test('refuses to save an empty form and never calls the API', async () => {
  await mount();

  let created: Client | null | undefined;
  await act(async () => {
    created = await current.submit();
  });

  expect(created).toBeNull();
  expect(current.errors).toEqual({
    name: 'required',
    cnpj: 'required',
    addressLine: 'required',
    city: 'required',
    state: 'required',
    phone: 'required',
    email: 'required',
    contactName: 'required',
  });
  expect(createClientMock).not.toHaveBeenCalled();
});

test('clears the error of a field as soon as it is edited', async () => {
  await mount();
  await act(async () => current.setField('email', 'contato'));
  await act(async () => {
    await current.submit();
  });

  expect(current.errors).toMatchObject({ name: 'required', email: 'invalid' });

  await act(async () => current.setField('name', 'Clínica VetNova'));

  expect(current.errors).not.toHaveProperty('name');
  expect(current.errors).toHaveProperty('email', 'invalid');
});

test('creates the clinic with the id token and the backend payload', async () => {
  await mount();
  await fillName();

  let created: Client | null | undefined;
  await act(async () => {
    created = await current.submit();
  });

  expect(createClientMock).toHaveBeenCalledWith('id-token', {
    type: 'CLINIC',
    name: 'Clínica VetNova',
    taxId: '11222333000181',
    taxIdType: 'CNPJ',
    addressLine: 'Rua das Hortênsias, 340',
    city: 'São Paulo',
    state: 'SP',
    phone: '1134567890',
    email: 'contato@vetnova.com.br',
    contactName: 'Dr. André Matos',
  });
  expect(created).toEqual(CREATED);
  expect(current.isSaving).toBe(false);
  expect(current.failure).toBeNull();
});

test('is saving while the API has not answered', async () => {
  let answer: (client: Client) => void = () => {};
  createClientMock.mockReturnValue(
    new Promise(resolve => {
      answer = resolve;
    }),
  );
  await mount();
  await fillName();

  let pending: Promise<Client | null> | undefined;
  await act(async () => {
    pending = current.submit();
  });

  expect(current.isSaving).toBe(true);

  await act(async () => {
    answer(CREATED);
    await pending;
  });

  expect(current.isSaving).toBe(false);
});

test.each([
  [
    'a duplicated name',
    new ApiError('Duplicated', 'DUPLICATED_CLIENT_NAME', 409),
    'clinics.newClinic.failures.duplicatedName',
  ],
  [
    'an expired session',
    new ApiError('Token expired', 'TOKEN_EXPIRED', 401),
    'clinics.newClinic.failures.session',
  ],
  [
    'any other API refusal',
    new ApiError('Validation failed', 'VALIDATION_ERROR', 400),
    'clinics.newClinic.failures.unknown',
  ],
])('reports %s with its own message', async (_case, error, key) => {
  createClientMock.mockRejectedValue(error);
  await mount();
  await fillName();

  let created: Client | null | undefined;
  await act(async () => {
    created = await current.submit();
  });

  expect(created).toBeNull();
  expect(current.failure).toBe(key);
  expect(current.isSaving).toBe(false);
});

test('reports a duplicated CNPJ as a field error, not the generic banner', async () => {
  createClientMock.mockRejectedValue(
    new ApiError('Duplicated', 'DUPLICATED_CLIENT_TAX_ID', 409),
  );
  await mount();
  await fillName();

  let created: Client | null | undefined;
  await act(async () => {
    created = await current.submit();
  });

  expect(created).toBeNull();
  expect(current.errors).toMatchObject({ cnpj: 'duplicated' });
  expect(current.failure).toBeNull();
});

test('asks to sign in again instead of calling the API without a session', async () => {
  await mount(null);
  await fillName();

  await act(async () => {
    await current.submit();
  });

  expect(createClientMock).not.toHaveBeenCalled();
  expect(current.failure).toBe('clinics.newClinic.failures.session');
});

test('reset clears the validation errors', async () => {
  await mount();
  await act(async () => {
    await current.submit();
  });

  await act(async () => current.reset());

  expect(current.errors).toEqual({});
});

test('reset clears what was typed and the API failure', async () => {
  createClientMock.mockRejectedValue(new Error('boom'));
  await mount();
  await fillName();
  await act(async () => {
    await current.submit();
  });

  expect(current.failure).toBe('clinics.newClinic.failures.unknown');

  await act(async () => current.reset());

  expect(current.draft).toEqual(EMPTY_CLINIC_DRAFT);
  expect(current.failure).toBeNull();
});

describe('sem conexão', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    createClientMock.mockRejectedValue(new TypeError('Network request failed'));
  });

  test('a clínica entra na fila e volta com id local, pronta para a lista', async () => {
    await mount();
    await fillName();

    let created: Client | null | undefined;
    await act(async () => {
      created = await current.submit();
    });

    expect(created).toMatchObject({
      id: 'local:uuid-1',
      name: 'Clínica VetNova',
      active: true,
    });
    expect(current.failure).toBeNull();
    expect(current.isSaving).toBe(false);
    expect(await loadClientOutbox(ACCOUNT.id)).toEqual([
      expect.objectContaining({ kind: 'create', localId: 'local:uuid-1' }),
    ]);
  });

  test('um CNPJ que já está na lista salva ou na fila é recusado no campo, mesmo com outro nome', async () => {
    await mount();
    await fillName('Clínica VetNova');
    await act(async () => {
      await current.submit();
    });

    await fillName('Clínica Outra');
    let second: Client | null | undefined;
    await act(async () => {
      second = await current.submit();
    });

    expect(second).toBeNull();
    expect(current.errors).toMatchObject({ cnpj: 'duplicated' });
    expect(current.failure).toBeNull();
    expect(await loadClientOutbox(ACCOUNT.id)).toHaveLength(1);
  });

  test('um nome que já está na lista salva é recusado na hora, como o backend faria', async () => {
    await mount();
    await fillName();
    await act(async () => {
      await current.submit();
    });

    let second: Client | null | undefined;
    await act(async () => {
      second = await current.submit();
    });

    expect(second).toBeNull();
    expect(current.failure).toBe('clinics.newClinic.failures.duplicatedName');
    expect(await loadClientOutbox(ACCOUNT.id)).toHaveLength(1);
  });
});
