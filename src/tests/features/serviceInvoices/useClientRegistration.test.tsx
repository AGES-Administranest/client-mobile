import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { createClient } from 'features/clinics/services/clientService';
import {
  useClientRegistration,
  type ClientRegistrationState,
} from 'features/serviceInvoices/hooks/useClientRegistration';

jest.mock('features/clinics/services/clientService', () => ({
  createClient: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const createClientMock = jest.mocked(createClient);

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

const CREATED = {
  id: 'client-new',
  name: 'Clínica Nova',
} as Awaited<ReturnType<typeof createClient>>;

const onCreated = jest.fn();

function mount() {
  const seen = {} as { current: ClientRegistrationState };

  function Probe() {
    seen.current = useClientRegistration({
      prefill: { name: 'Clínica Nova', taxId: '11222333000181' },
      onCreated,
    });
    return null;
  }

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    renderer = ReactTestRenderer.create(
      <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
        <Probe />
      </AuthProvider>,
    );
  });
  return { seen, renderer };
}

function fillValidClinic(seen: { current: ClientRegistrationState }) {
  act(() => seen.current.open());
  act(() => {
    seen.current.form.setField('addressLine', 'Rua das Hortênsias, 340');
    seen.current.form.setField('city', 'Campinas');
    seen.current.form.setField('state', 'SP');
    seen.current.form.setField('phone', '1934567890');
    seen.current.form.setField('email', 'contato@novaexemplo.com.br');
    seen.current.form.setField('contactName', 'Dr André Matos');
  });
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('useClientRegistration', () => {
  it('hands the created taker back once it is saved', async () => {
    createClientMock.mockResolvedValue(CREATED);
    const { seen } = mount();
    fillValidClinic(seen);

    await act(async () => {
      await seen.current.submit();
    });

    expect(onCreated).toHaveBeenCalledWith(CREATED);
  });

  it('does not hand the taker back when the screen was left during the save', async () => {
    let finish: (client: typeof CREATED) => void = () => {};
    createClientMock.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      }),
    );
    const { seen, renderer } = mount();
    fillValidClinic(seen);

    let pending!: Promise<void>;
    act(() => {
      pending = seen.current.submit();
    });
    act(() => renderer.unmount());
    await act(async () => {
      finish(CREATED);
      await pending;
    });

    expect(onCreated).not.toHaveBeenCalled();
  });
});
