import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import { useNewClientForm } from './useNewClientForm';
import type { Client } from '../domain/client';
import { createClient } from '../services/clientService';

jest.mock('../services/clientService', () => ({
  fetchClients: jest.fn(),
  createClient: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const createMock = createClient as jest.MockedFunction<typeof createClient>;

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

async function mountHook() {
  const result = {
    current: null as unknown as ReturnType<typeof useNewClientForm>,
  };

  function Harness() {
    result.current = useNewClientForm();
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

const CREATED = { id: 'new-1', name: 'Clínica Nova Vida' } as Client;

beforeEach(() => {
  createMock.mockReset().mockResolvedValue(CREATED);
});

test('sem nome não chama a API e marca o campo', async () => {
  const result = await mountHook();

  let created: Client | null = CREATED;
  await act(async () => {
    created = await result.current.submit();
  });

  expect(created).toBeNull();
  expect(createMock).not.toHaveBeenCalled();
  expect(result.current.errors.name).toBe('required');
});

test('envia exatamente CLINIC ou INDIVIDUAL, o nome e o telefone opcional', async () => {
  const result = await mountHook();
  await act(async () => result.current.setType('INDIVIDUAL'));
  await act(async () => result.current.setField('name', ' Maria Souza '));
  await act(async () => result.current.setField('phone', '+55 51 99999-0000'));

  let created: Client | null = null;
  await act(async () => {
    created = await result.current.submit();
  });

  expect(createMock).toHaveBeenCalledWith('id-token', {
    type: 'INDIVIDUAL',
    name: 'Maria Souza',
    phone: '+55 51 99999-0000',
  });
  expect(created).toBe(CREATED);
});

test('o tipo padrão é CLINIC', async () => {
  const result = await mountHook();
  await act(async () => result.current.setField('name', 'Clínica X'));

  await act(async () => {
    await result.current.submit();
  });

  expect(createMock).toHaveBeenCalledWith(
    'id-token',
    expect.objectContaining({ type: 'CLINIC' }),
  );
});

test('409 DUPLICATED_CLIENT_NAME vira a mensagem de nome duplicado', async () => {
  createMock.mockRejectedValue(
    new ApiError('dup', 'DUPLICATED_CLIENT_NAME', 409),
  );
  const result = await mountHook();
  await act(async () => result.current.setField('name', 'Clínica VetCenter'));

  await act(async () => {
    await result.current.submit();
  });

  expect(result.current.failure).toBe(
    'clients.newClient.failures.duplicatedName',
  );
  expect(result.current.isSaving).toBe(false);
});

test('401 vira a mensagem de sessão e erro desconhecido a genérica', async () => {
  createMock.mockRejectedValueOnce(new ApiError('x', 'TOKEN_EXPIRED', 401));
  const result = await mountHook();
  await act(async () => result.current.setField('name', 'Clínica X'));

  await act(async () => {
    await result.current.submit();
  });
  expect(result.current.failure).toBe('clients.newClient.failures.session');

  createMock.mockRejectedValueOnce(new Error('boom'));
  await act(async () => {
    await result.current.submit();
  });
  expect(result.current.failure).toBe('clients.newClient.failures.unknown');
});
