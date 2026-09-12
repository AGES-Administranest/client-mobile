import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { AuthFlow } from './AuthFlow';
import { AuthError } from '../domain/authErrors';
import { AuthProvider, useAuth } from '../hooks/AuthContext';
import * as authService from '../services/authService';

jest.mock('../services/authService');

const service = jest.mocked(authService);

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const SESSION = {
  idToken: 'id',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

let sessionSeen: unknown = null;

function SessionProbe() {
  sessionSeen = useAuth().session;
  return null;
}

async function renderFlow() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider>
            <SessionProbe />
            <AuthFlow />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });

  return renderer;
}

function texts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );
}

function byLabel(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAll(
    node => node.props.accessibilityLabel === label,
  )[0];
}

async function press(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  await act(async () => {
    byLabel(renderer, label).props.onPress();
  });
}

async function type(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
  value: string,
) {
  await act(async () => {
    byLabel(renderer, label).props.onChangeText(value);
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  sessionSeen = null;
});

describe('welcome', () => {
  it('shows the translated branding and both entry points', async () => {
    const renderer = await renderFlow();
    const content = texts(renderer);

    expect(content).toContain('Administranest');
    expect(content).toContain('Anestesia Veterinária');
    expect(content).toContain('Seja bem-vindo(a)');
    expect(byLabel(renderer, 'Criar conta')).toBeDefined();
    expect(byLabel(renderer, 'Login')).toBeDefined();
  });
});

describe('login', () => {
  it('signs in directly without requiring field validation', async () => {
    service.signIn.mockResolvedValue(SESSION);
    const renderer = await renderFlow();
    await press(renderer, 'Login');
    await press(renderer, 'Entrar');

    expect(sessionSeen).toEqual(SESSION);
  });

  it('stores the session returned by signIn with typed credentials', async () => {
    service.signIn.mockResolvedValue(SESSION);
    const renderer = await renderFlow();

    await press(renderer, 'Login');
    await type(renderer, 'E-mail', ' ana@example.com ');
    await type(renderer, 'Senha', 'Passw0rd@');
    await press(renderer, 'Entrar');

    expect(service.signIn).toHaveBeenCalledWith('ana@example.com', 'Passw0rd@');
    expect(sessionSeen).toEqual(SESSION);
  });

  it('falls back to dev session when service fails to allow entry without validation', async () => {
    service.signIn.mockRejectedValue(new Error('Network error'));
    const renderer = await renderFlow();

    await press(renderer, 'Login');
    await press(renderer, 'Entrar');

    expect(sessionSeen).not.toBeNull();
  });
});

describe('sign up', () => {
  async function fillSignUp(renderer: ReactTestRenderer.ReactTestRenderer) {
    await press(renderer, 'Criar conta');
    await type(renderer, 'Nome', 'Ana');
    await type(renderer, 'E-mail', 'ana@example.com');
    await type(renderer, 'Senha', 'Passw0rd@');
    await type(renderer, 'Confirmar senha', 'Passw0rd@');
  }

  it('rejects a password confirmation that does not match', async () => {
    const renderer = await renderFlow();
    await fillSignUp(renderer);
    await type(renderer, 'Confirmar senha', 'other');
    await press(renderer, 'Criar conta');

    expect(texts(renderer)).toContain('As senhas não coincidem.');
    expect(service.signUp).not.toHaveBeenCalled();
  });

  it('confirms the code and signs the new user in', async () => {
    service.signUp.mockResolvedValue({ userSub: 'sub', isConfirmed: false });
    service.confirmSignUp.mockResolvedValue();
    service.signIn.mockResolvedValue(SESSION);
    const renderer = await renderFlow();

    await fillSignUp(renderer);
    await press(renderer, 'Criar conta');

    expect(service.signUp).toHaveBeenCalledWith(
      'ana@example.com',
      'Passw0rd@',
      'Ana',
    );
    expect(texts(renderer)).toContain('ana@example.com');
    expect(service.resendConfirmationCode).not.toHaveBeenCalled();

    await type(renderer, 'Código de confirmação', '123456');
    await press(renderer, 'Confirmar');

    expect(service.confirmSignUp).toHaveBeenCalledWith(
      'ana@example.com',
      '123456',
    );
    expect(service.signIn).toHaveBeenCalledWith('ana@example.com', 'Passw0rd@');
    expect(sessionSeen).toEqual(SESSION);
  });

  it('keeps the user on the confirmation step when the code is wrong', async () => {
    service.signUp.mockResolvedValue({ userSub: 'sub', isConfirmed: false });
    service.confirmSignUp.mockRejectedValue(new AuthError('INVALID_CODE'));
    const renderer = await renderFlow();

    await fillSignUp(renderer);
    await press(renderer, 'Criar conta');
    await type(renderer, 'Código de confirmação', '000000');
    await press(renderer, 'Confirmar');

    expect(texts(renderer)).toContain('Código inválido.');
    expect(service.signIn).not.toHaveBeenCalled();
  });
});
