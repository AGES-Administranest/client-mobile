import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { AuthFlow } from './AuthFlow';
import { TermsScreen } from './TermsScreen';
import { Account, TERMS_VERSION } from '../domain/account';
import { AuthError } from '../domain/authErrors';
import { AuthProvider, useAuth } from '../hooks/AuthContext';
import * as accountApi from '../services/accountApi';
import * as authService from '../services/authService';
import * as socialAuthService from '../services/socialAuthService';

jest.mock('../services/authService');
jest.mock('../services/socialAuthService');
jest.mock('../services/accountApi');

const service = jest.mocked(authService);
const socialService = jest.mocked(socialAuthService);
const api = jest.mocked(accountApi);

const TERMS_LABEL = 'Li e aceito os Termos de Uso e a Política de Privacidade.';

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

const ACCOUNT: Account = {
  id: 'user-1',
  name: 'Ana Souza',
  email: 'ana@example.com',
  termsAcceptedAt: null,
  termsVersion: null,
};

const ACCEPTED: Account = {
  ...ACCOUNT,
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

let sessionSeen: unknown = null;
let accountSeen: unknown = null;

function SessionProbe() {
  const auth = useAuth();
  sessionSeen = auth.session;
  accountSeen = auth.account;
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
  accountSeen = null;
  api.createSession.mockResolvedValue(ACCOUNT);
  api.acceptTerms.mockResolvedValue(ACCEPTED);
  service.signOut.mockResolvedValue();
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

describe('social sign in', () => {
  it('offers Google, and only Google, on the welcome and login screens', async () => {
    const renderer = await renderFlow();

    expect(byLabel(renderer, 'Continuar com Google')).toBeDefined();
    expect(byLabel(renderer, 'Continuar com Apple')).toBeUndefined();

    await press(renderer, 'Login');

    expect(byLabel(renderer, 'Continuar com Google')).toBeDefined();
  });

  it('stores the session of the Google sign in', async () => {
    socialService.signInWithProvider.mockResolvedValue(SESSION);
    const renderer = await renderFlow();

    await press(renderer, 'Continuar com Google');

    expect(socialService.signInWithProvider).toHaveBeenCalledWith('Google');
    expect(sessionSeen).toEqual(SESSION);
  });

  it('stays quiet when the user backs out of the provider screen', async () => {
    socialService.signInWithProvider.mockResolvedValue(null);
    const renderer = await renderFlow();
    const before = texts(renderer);

    await press(renderer, 'Continuar com Google');

    expect(sessionSeen).toBeNull();
    expect(texts(renderer)).toBe(before);
  });

  it('shows the generic message when the provider flow fails', async () => {
    socialService.signInWithProvider.mockRejectedValue(
      new AuthError('NETWORK_UNAVAILABLE'),
    );
    const renderer = await renderFlow();

    await press(renderer, 'Login');
    await press(renderer, 'Continuar com Google');

    expect(texts(renderer)).toContain(
      'Sem conexão. Verifique sua internet e tente novamente.',
    );
    expect(sessionSeen).toBeNull();
  });
});

describe('login', () => {
  it('validates locally before calling Cognito', async () => {
    const renderer = await renderFlow();
    await press(renderer, 'Login');
    await type(renderer, 'E-mail', 'ana');
    await press(renderer, 'Entrar');

    expect(texts(renderer)).toContain('Informe um e-mail válido.');
    expect(texts(renderer)).toContain('Campo obrigatório.');
    expect(service.signIn).not.toHaveBeenCalled();
  });

  it('stores the session returned by signIn', async () => {
    service.signIn.mockResolvedValue(SESSION);
    const renderer = await renderFlow();

    await press(renderer, 'Login');
    await type(renderer, 'E-mail', ' ana@example.com ');
    await type(renderer, 'Senha', 'Passw0rd@');
    await press(renderer, 'Entrar');

    expect(service.signIn).toHaveBeenCalledWith('ana@example.com', 'Passw0rd@');
    expect(api.createSession).toHaveBeenCalledWith('id');
    expect(sessionSeen).toEqual(SESSION);
    expect(accountSeen).toEqual(ACCOUNT);
  });

  it('explains an e-mail that already signs in another way, and stays signed out', async () => {
    service.signIn.mockResolvedValue(SESSION);
    api.createSession.mockRejectedValue(
      new AuthError('ACCOUNT_USES_OTHER_SIGN_IN'),
    );
    const renderer = await renderFlow();

    await press(renderer, 'Login');
    await type(renderer, 'E-mail', 'ana@example.com');
    await type(renderer, 'Senha', 'Passw0rd@');
    await press(renderer, 'Entrar');

    expect(texts(renderer)).toContain(
      'Este e-mail já tem uma conta com outra forma de entrar.',
    );
    expect(service.signOut).toHaveBeenCalledWith(SESSION);
    expect(sessionSeen).toBeNull();
  });

  it('shows one generic message for wrong credentials', async () => {
    service.signIn.mockRejectedValue(new AuthError('INVALID_CREDENTIALS'));
    const renderer = await renderFlow();

    await press(renderer, 'Login');
    await type(renderer, 'E-mail', 'ana@example.com');
    await type(renderer, 'Senha', 'wrong');
    await press(renderer, 'Entrar');

    expect(texts(renderer)).toContain('E-mail ou senha incorretos.');
    expect(sessionSeen).toBeNull();
  });

  it('sends an unconfirmed account to the confirmation step with a new code', async () => {
    service.signIn.mockRejectedValueOnce(new AuthError('USER_NOT_CONFIRMED'));
    service.resendConfirmationCode.mockResolvedValue();
    const renderer = await renderFlow();

    await press(renderer, 'Login');
    await type(renderer, 'E-mail', 'ana@example.com');
    await type(renderer, 'Senha', 'Passw0rd@');
    await press(renderer, 'Entrar');

    expect(texts(renderer)).toContain('Confirme seu e-mail');
    expect(service.resendConfirmationCode).toHaveBeenCalledWith(
      'ana@example.com',
    );
  });
});

describe('sign up', () => {
  async function fillSignUp(renderer: ReactTestRenderer.ReactTestRenderer) {
    await press(renderer, 'Criar conta');
    await type(renderer, 'Nome', 'Ana');
    await type(renderer, 'E-mail', 'ana@example.com');
    await type(renderer, 'Senha', 'Passw0rd@');
    await type(renderer, 'Confirmar senha', 'Passw0rd@');
    await press(renderer, TERMS_LABEL);
  }

  it('does not create the account without accepting the terms', async () => {
    const renderer = await renderFlow();
    await fillSignUp(renderer);
    await press(renderer, TERMS_LABEL);
    await press(renderer, 'Criar conta');

    expect(texts(renderer)).toContain('Aceite os termos para continuar.');
    expect(service.signUp).not.toHaveBeenCalled();
  });

  it('rejects a password confirmation that does not match', async () => {
    const renderer = await renderFlow();
    await fillSignUp(renderer);
    await type(renderer, 'Confirmar senha', 'other');
    await press(renderer, 'Criar conta');

    expect(texts(renderer)).toContain('As senhas não coincidem.');
    expect(service.signUp).not.toHaveBeenCalled();
  });

  it('confirms the code, signs the new user in and records the terms', async () => {
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
    expect(api.createSession).toHaveBeenCalledWith('id');
    expect(api.acceptTerms).toHaveBeenCalledWith('id', TERMS_VERSION);
    expect(sessionSeen).toEqual(SESSION);
    expect(accountSeen).toEqual(ACCEPTED);
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

describe('terms screen', () => {
  async function renderTerms() {
    let renderer!: ReactTestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = ReactTestRenderer.create(
        <SafeAreaProvider initialMetrics={METRICS}>
          <I18nProvider>
            <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
              <SessionProbe />
              <TermsScreen />
            </AuthProvider>
          </I18nProvider>
        </SafeAreaProvider>,
      );
    });

    return renderer;
  }

  it('greets the account and asks for consent before recording it', async () => {
    const renderer = await renderTerms();

    expect(texts(renderer)).toContain('Olá, Ana Souza.');
    await press(renderer, 'Aceitar e continuar');

    expect(texts(renderer)).toContain('Aceite os termos para continuar.');
    expect(api.acceptTerms).not.toHaveBeenCalled();
  });

  it('records the current version once the box is ticked', async () => {
    const renderer = await renderTerms();

    await press(renderer, TERMS_LABEL);
    await press(renderer, 'Aceitar e continuar');

    expect(api.acceptTerms).toHaveBeenCalledWith('id', TERMS_VERSION);
    expect(accountSeen).toEqual(ACCEPTED);
  });

  it('lets the person leave the account instead of accepting', async () => {
    const renderer = await renderTerms();

    await act(async () => {
      renderer.root
        .findAll(
          node =>
            node.props.accessibilityLabel === 'Sair da conta' &&
            typeof node.props.onPress === 'function',
        )[0]
        .props.onPress();
    });

    expect(service.signOut).toHaveBeenCalledWith(SESSION);
    expect(sessionSeen).toBeNull();
    expect(accountSeen).toBeNull();
  });
});
