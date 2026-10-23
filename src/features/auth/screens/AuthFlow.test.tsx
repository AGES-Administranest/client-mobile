import { BackHandler } from 'react-native';
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

const mounted: ReactTestRenderer.ReactTestRenderer[] = [];

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

  mounted.push(renderer);
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

afterEach(() => {
  // Unmount so the resend countdown's interval does not outlive the test.
  act(() => mounted.splice(0).forEach(renderer => renderer.unmount()));
});

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

describe('social sign in outside production', () => {
  it('offers only e-mail and password on the welcome and login screens', async () => {
    const renderer = await renderFlow();

    expect(byLabel(renderer, 'Continuar com Google')).toBeUndefined();

    await press(renderer, 'Login');

    expect(byLabel(renderer, 'Continuar com Google')).toBeUndefined();
  });
});

describe('social sign in in production', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_APP_ENV = 'production';
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_APP_ENV;
  });

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

describe('forgot password', () => {
  async function openForgotPassword() {
    const renderer = await renderFlow();
    await press(renderer, 'Login');
    await press(renderer, 'Esqueci minha senha');
    return renderer;
  }

  async function openNewPassword() {
    service.forgotPassword.mockResolvedValue();
    const renderer = await openForgotPassword();
    await type(renderer, 'DIGITE SEU EMAIL*', 'ana@example.com');
    await press(renderer, 'Confirmar');
    await press(renderer, 'Já tenho o código');
    return renderer;
  }

  it('rejects a malformed e-mail before calling the service', async () => {
    const renderer = await openForgotPassword();

    await type(renderer, 'DIGITE SEU EMAIL*', 'not-an-email');
    await press(renderer, 'Confirmar');

    expect(service.forgotPassword).not.toHaveBeenCalled();
    expect(texts(renderer)).toContain('Informe um e-mail válido.');
  });

  it('goes to the e-mail sent screen when Cognito cannot send a code to the account (InvalidParameterException)', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID = 'test-client';
    process.env.EXPO_PUBLIC_COGNITO_ENDPOINT = 'http://localhost:4566';
    const originalFetch = globalThis.fetch;
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () =>
        Promise.resolve({
          __type: 'InvalidParameterException',
          message: 'no registered/verified email',
        }),
    }) as unknown as typeof fetch;
    service.forgotPassword.mockImplementation(
      jest.requireActual('../services/authService').forgotPassword,
    );
    const renderer = await openForgotPassword();

    await type(renderer, 'DIGITE SEU EMAIL*', 'google@example.com');
    await press(renderer, 'Confirmar');

    expect(texts(renderer)).toContain('E-mail enviado');
    expect(texts(renderer)).not.toContain('Verifique os dados informados.');
    globalThis.fetch = originalFetch;
    warn.mockRestore();
  });

  it('keeps blocking a badly formatted e-mail on the client, without calling the service', async () => {
    const renderer = await openForgotPassword();

    await type(renderer, 'DIGITE SEU EMAIL*', 'google@');
    await press(renderer, 'Confirmar');

    expect(service.forgotPassword).not.toHaveBeenCalled();
    expect(texts(renderer)).toContain('Informe um e-mail válido.');
    expect(texts(renderer)).not.toContain('E-mail enviado');
  });

  it('shows the not-found state only when the service reports it', async () => {
    service.forgotPassword.mockRejectedValue(new AuthError('EMAIL_NOT_FOUND'));
    const renderer = await openForgotPassword();

    await type(renderer, 'DIGITE SEU EMAIL*', 'ana@example.com');
    await press(renderer, 'Confirmar');

    expect(texts(renderer)).toContain(
      'E-mail não encontrado. Verifique o endereço ou crie uma conta.',
    );
  });

  it('keeps the typed e-mail and shows the network message offline', async () => {
    service.forgotPassword.mockRejectedValue(
      new AuthError('NETWORK_UNAVAILABLE'),
    );
    const renderer = await openForgotPassword();

    await type(renderer, 'DIGITE SEU EMAIL*', 'ana@example.com');
    await press(renderer, 'Confirmar');

    expect(texts(renderer)).toContain(
      'Sem conexão. Verifique sua internet e tente novamente.',
    );
    expect(byLabel(renderer, 'DIGITE SEU EMAIL*').props.value).toBe(
      'ana@example.com',
    );
  });

  it('confirms the e-mail was sent with the 45s countdown', async () => {
    service.forgotPassword.mockResolvedValue();
    const renderer = await openForgotPassword();

    await type(renderer, 'DIGITE SEU EMAIL*', ' ana@example.com ');
    await press(renderer, 'Confirmar');

    expect(service.forgotPassword).toHaveBeenCalledWith('ana@example.com');
    expect(texts(renderer)).toContain('E-mail enviado');
    expect(texts(renderer)).toContain('Enviamos um código para redefinir');
    expect(
      byLabel(renderer, 'Não recebeu? Reenviar em 00:45').props.disabled,
    ).toBe(true);
  });

  it('explains each unmet requirement and a mismatch, then succeeds', async () => {
    service.confirmForgotPassword.mockResolvedValue();
    const renderer = await openNewPassword();

    await type(renderer, 'CÓDIGO RECEBIDO*', '123456');
    await type(renderer, 'NOVA SENHA*', 'abc');
    await type(renderer, 'CONFIRME NOVA SENHA*', 'abd');
    await press(renderer, 'Confirmar');

    expect(service.confirmForgotPassword).not.toHaveBeenCalled();
    expect(texts(renderer)).toContain(
      'Sua senha ainda não atende aos requisitos:',
    );
    expect(texts(renderer)).toContain('As senhas não coincidem');

    await type(renderer, 'NOVA SENHA*', 'Abcdef1!');
    await type(renderer, 'CONFIRME NOVA SENHA*', 'Abcdef1!');
    expect(texts(renderer)).toContain('As senhas coincidem');
    await press(renderer, 'Confirmar');

    expect(service.confirmForgotPassword).toHaveBeenCalledWith(
      'ana@example.com',
      '123456',
      'Abcdef1!',
    );
    expect(texts(renderer)).toContain('Senha alterada com sucesso!');

    await press(renderer, 'Ir para o Login');
    expect(texts(renderer)).toContain(
      'Acesse com o e-mail e a senha da sua conta.',
    );
  });

  it('has no back button on the success screen, only "Ir para o Login"', async () => {
    service.confirmForgotPassword.mockResolvedValue();
    const renderer = await openNewPassword();
    expect(
      renderer.root.findAll(n => n.props.accessibilityLabel === 'Voltar')
        .length,
    ).toBeGreaterThan(0);

    await type(renderer, 'CÓDIGO RECEBIDO*', '123456');
    await type(renderer, 'NOVA SENHA*', 'Abcdef1!');
    await type(renderer, 'CONFIRME NOVA SENHA*', 'Abcdef1!');
    await press(renderer, 'Confirmar');

    expect(texts(renderer)).toContain('Senha alterada com sucesso!');
    expect(
      renderer.root.findAll(n => n.props.accessibilityLabel === 'Voltar'),
    ).toHaveLength(0);
    expect(byLabel(renderer, 'Ir para o Login')).toBeDefined();
  });

  it('sends the system back on the success screen to the login, never to the reset form', async () => {
    const listeners: Array<(event: never) => boolean | null | undefined> = [];
    const add = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_event, handler) => {
        listeners.push(handler);
        return { remove: jest.fn() };
      });
    service.confirmForgotPassword.mockResolvedValue();
    const renderer = await openNewPassword();
    await type(renderer, 'CÓDIGO RECEBIDO*', '123456');
    await type(renderer, 'NOVA SENHA*', 'Abcdef1!');
    await type(renderer, 'CONFIRME NOVA SENHA*', 'Abcdef1!');
    await press(renderer, 'Confirmar');
    expect(texts(renderer)).toContain('Senha alterada com sucesso!');

    let handled: boolean | null | undefined;
    await act(async () => {
      handled = listeners[listeners.length - 1](undefined as never);
    });

    expect(handled).toBe(true);
    expect(texts(renderer)).toContain(
      'Acesse com o e-mail e a senha da sua conta.',
    );
    expect(texts(renderer)).not.toContain('Redefinir senha');
    add.mockRestore();
  });

  it('sends the user to the expired code screen', async () => {
    service.confirmForgotPassword.mockRejectedValue(
      new AuthError('EXPIRED_CODE'),
    );
    const renderer = await openNewPassword();

    await type(renderer, 'CÓDIGO RECEBIDO*', '123456');
    await type(renderer, 'NOVA SENHA*', 'Abcdef1!');
    await type(renderer, 'CONFIRME NOVA SENHA*', 'Abcdef1!');
    await press(renderer, 'Confirmar');

    expect(texts(renderer)).toContain('Código expirado');
    expect(texts(renderer)).toContain('Este código não é mais válido');
    expect(texts(renderer)).toContain(
      'O código de recuperação expirou ou já foi utilizado. Por segurança, ele é válido por apenas 1 hora.',
    );
    expect(texts(renderer)).not.toContain('Código inválido.');

    await press(renderer, 'Solicitar novo código');
    expect(byLabel(renderer, 'DIGITE SEU EMAIL*')).toBeDefined();
  });

  it('shows a wrong code inline on the code field and stays on the reset screen', async () => {
    service.confirmForgotPassword.mockRejectedValue(
      new AuthError('INVALID_CODE'),
    );
    const renderer = await openNewPassword();

    await type(renderer, 'CÓDIGO RECEBIDO*', '000000');
    await type(renderer, 'NOVA SENHA*', 'Abcdef1!');
    await type(renderer, 'CONFIRME NOVA SENHA*', 'Abcdef1!');
    await press(renderer, 'Confirmar');

    expect(service.confirmForgotPassword).toHaveBeenCalledWith(
      'ana@example.com',
      '000000',
      'Abcdef1!',
    );
    expect(texts(renderer)).toContain('Código inválido.');
    expect(texts(renderer)).not.toContain('Código expirado');
    expect(texts(renderer)).not.toContain('Este código não é mais válido');
    expect(byLabel(renderer, 'CÓDIGO RECEBIDO*').props.value).toBe('000000');
    expect(byLabel(renderer, 'NOVA SENHA*').props.value).toBe('Abcdef1!');
    expect(byLabel(renderer, 'CONFIRME NOVA SENHA*').props.value).toBe(
      'Abcdef1!',
    );
  });

  it('clears the wrong-code message once the code is edited', async () => {
    service.confirmForgotPassword.mockRejectedValue(
      new AuthError('INVALID_CODE'),
    );
    const renderer = await openNewPassword();
    await type(renderer, 'CÓDIGO RECEBIDO*', '000000');
    await type(renderer, 'NOVA SENHA*', 'Abcdef1!');
    await type(renderer, 'CONFIRME NOVA SENHA*', 'Abcdef1!');
    await press(renderer, 'Confirmar');
    expect(texts(renderer)).toContain('Código inválido.');

    await type(renderer, 'CÓDIGO RECEBIDO*', '123456');

    expect(texts(renderer)).not.toContain('Código inválido.');
  });

  it('sends an expired code and a wrong code to different places', async () => {
    service.confirmForgotPassword.mockRejectedValueOnce(
      new AuthError('INVALID_CODE'),
    );
    const renderer = await openNewPassword();
    await type(renderer, 'CÓDIGO RECEBIDO*', '000000');
    await type(renderer, 'NOVA SENHA*', 'Abcdef1!');
    await type(renderer, 'CONFIRME NOVA SENHA*', 'Abcdef1!');
    await press(renderer, 'Confirmar');
    expect(texts(renderer)).toContain('Código inválido.');
    expect(texts(renderer)).not.toContain('Código expirado');

    service.confirmForgotPassword.mockRejectedValueOnce(
      new AuthError('EXPIRED_CODE'),
    );
    await press(renderer, 'Confirmar');
    expect(texts(renderer)).toContain('Código expirado');
  });

  it('asks for the code: the reset does not call the service without it', async () => {
    const renderer = await openNewPassword();

    await type(renderer, 'NOVA SENHA*', 'Abcdef1!');
    await type(renderer, 'CONFIRME NOVA SENHA*', 'Abcdef1!');
    await press(renderer, 'Confirmar');

    expect(service.confirmForgotPassword).not.toHaveBeenCalled();
    expect(texts(renderer)).toContain('Campo obrigatório');
  });

  it('keeps the typed passwords when the network fails', async () => {
    service.confirmForgotPassword.mockRejectedValue(
      new AuthError('NETWORK_UNAVAILABLE'),
    );
    const renderer = await openNewPassword();

    await type(renderer, 'CÓDIGO RECEBIDO*', '123456');
    await type(renderer, 'NOVA SENHA*', 'Abcdef1!');
    await type(renderer, 'CONFIRME NOVA SENHA*', 'Abcdef1!');
    await press(renderer, 'Confirmar');

    expect(texts(renderer)).toContain(
      'Sem conexão. Verifique sua internet e tente novamente.',
    );
    expect(byLabel(renderer, 'NOVA SENHA*').props.value).toBe('Abcdef1!');
  });
});
