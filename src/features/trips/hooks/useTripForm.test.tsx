import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';

import { useTripForm } from './useTripForm';

jest.mock('features/vehicles', () => ({
  useVehicles: () => ({ vehicles: [], isLoading: false }),
}));
jest.mock('features/clients/services/clientService', () => ({
  fetchClients: jest.fn().mockResolvedValue([]),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

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

const HOSPVET = { id: 'client-1', name: 'HospVet Sul' };
const VETCENTER = { id: 'client-2', name: 'VetCenter' };

async function mountHook() {
  const result = {
    current: null as unknown as ReturnType<typeof useTripForm>,
  };

  function Harness() {
    result.current = useTripForm();
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

describe('useTripForm destination from the clinic', () => {
  it('fills an empty destination with the chosen clinic', async () => {
    const form = await mountHook();

    await act(async () => form.current.clientSearch.onSelect(HOSPVET));

    expect(form.current.values.clientId).toBe('client-1');
    expect(form.current.values.destination).toBe('HospVet Sul');
  });

  it('follows the clinic when it is changed, as long as the destination was not typed over', async () => {
    const form = await mountHook();

    await act(async () => form.current.clientSearch.onSelect(HOSPVET));
    await act(async () => form.current.clientSearch.onSelect(VETCENTER));

    expect(form.current.values.destination).toBe('VetCenter');
  });

  it('keeps a destination the person typed', async () => {
    const form = await mountHook();

    await act(async () =>
      form.current.setFieldValue('destination', 'Rua das Flores, 12'),
    );
    await act(async () => form.current.clientSearch.onSelect(HOSPVET));

    expect(form.current.values.destination).toBe('Rua das Flores, 12');
    expect(form.current.values.clientId).toBe('client-1');
  });
});
