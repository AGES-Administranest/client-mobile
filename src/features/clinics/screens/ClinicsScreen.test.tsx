import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AuthProvider,
  TERMS_VERSION,
  type Account,
  type AuthSession,
} from 'features/auth';
import { I18nProvider } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';

import { ClinicsScreen } from './ClinicsScreen';
import type { Client } from '../domain/client';
import { createClient } from '../services/clientService';

jest.mock('../services/clientService', () => ({
  createClient: jest.fn(),
}));
// A sessão entra pronta pelo AuthProvider; nada de auth pode ir à rede.
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const createClientMock = createClient as jest.MockedFunction<
  typeof createClient
>;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

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
  taxId: null,
  taxIdType: null,
  contactName: null,
  email: null,
  phone: null,
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

beforeEach(() => {
  createClientMock.mockReset().mockResolvedValue(CREATED);
});

async function render() {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <ClinicsScreen />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });

  return renderer!;
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );
}

function buttonWithText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  text: string,
) {
  return renderer.root
    .findAll(
      node =>
        node.props.role === 'button' &&
        typeof node.props.onPress === 'function',
    )
    .find(node =>
      node
        .findAllByType('Text' as never)
        .some(label => label.props.children === text),
    )!;
}

function isSheetOpen(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAll(node => node.props.accessibilityLabel === 'Nome da clínica')
    .some(node => typeof node.props.onChangeText === 'function');
}

async function press(
  renderer: ReactTestRenderer.ReactTestRenderer,
  text: string,
) {
  await act(async () => {
    await buttonWithText(renderer, text).props.onPress();
  });
}

async function typeName(
  renderer: ReactTestRenderer.ReactTestRenderer,
  name: string,
) {
  await act(async () => {
    renderer.root
      .find(
        node =>
          node.props.accessibilityLabel === 'Nome da clínica' &&
          typeof node.props.onChangeText === 'function',
      )
      .props.onChangeText(name);
  });
}

test('starts with no clinics listed', async () => {
  const renderer = await render();

  expect(textsOf(renderer)).toContain('Nenhuma clínica cadastrada.');
});

test('opens the new clinic sheet from the "Adicionar clínica" button', async () => {
  const renderer = await render();

  expect(isSheetOpen(renderer)).toBe(false);

  await press(renderer, 'Adicionar clínica');

  expect(isSheetOpen(renderer)).toBe(true);
  expect(textsOf(renderer)).toContain('Nova clínica');
});

test('keeps the sheet open and explains what is missing', async () => {
  const renderer = await render();
  await press(renderer, 'Adicionar clínica');

  await press(renderer, 'Confirmar');

  expect(createClientMock).not.toHaveBeenCalled();
  expect(isSheetOpen(renderer)).toBe(true);
  expect(textsOf(renderer)).toContain('Informe o nome da clínica.');
});

test('saves the clinic and closes the sheet', async () => {
  const renderer = await render();
  await press(renderer, 'Adicionar clínica');
  await typeName(renderer, 'Clínica VetNova');

  await press(renderer, 'Confirmar');

  expect(createClientMock).toHaveBeenCalledWith('id-token', {
    type: 'CLINIC',
    name: 'Clínica VetNova',
  });
  expect(isSheetOpen(renderer)).toBe(false);
  expect(textsOf(renderer)).toContain('1 clínica');
  expect(textsOf(renderer)).toContain('Clínica VetNova');
  expect(textsOf(renderer)).not.toContain('Nenhuma clínica cadastrada.');
});

test('shows the API failure and keeps what was typed', async () => {
  createClientMock.mockRejectedValue(
    new ApiError('Duplicated', 'DUPLICATED_CLIENT_NAME', 409),
  );
  const renderer = await render();
  await press(renderer, 'Adicionar clínica');
  await typeName(renderer, 'Clínica VetNova');

  await press(renderer, 'Confirmar');

  expect(isSheetOpen(renderer)).toBe(true);
  expect(textsOf(renderer)).toContain('Já existe uma clínica com esse nome.');
});

test('opens a clean form every time', async () => {
  const renderer = await render();
  await press(renderer, 'Adicionar clínica');
  await typeName(renderer, 'Rascunho');
  await act(async () => {
    renderer.root
      .find(
        node =>
          node.props.accessibilityLabel === 'Fechar' &&
          typeof node.props.onPress === 'function',
      )
      .props.onPress();
  });

  await press(renderer, 'Adicionar clínica');

  expect(
    renderer.root.find(
      node =>
        node.props.accessibilityLabel === 'Nome da clínica' &&
        typeof node.props.onChangeText === 'function',
    ).props.value,
  ).toBe('');
});
