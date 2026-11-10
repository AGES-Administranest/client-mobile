import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { I18nProvider } from 'shared/i18n';
import { ApiError } from 'shared/services/apiClient';
import { isOnline } from 'shared/services/network';

import { ProfileScreen } from './ProfileScreen';
import type { Profile } from '../domain/profile';
import {
  loadPendingProfileEdit,
  saveCachedProfile,
  saveProfileRejected,
} from '../services/profileCache';
import { fetchProfile, updateProfile } from '../services/profileService';

jest.mock('../services/profileService', () => ({
  fetchProfile: jest.fn(),
  updateProfile: jest.fn(),
}));
jest.mock('shared/services/network', () => ({ isOnline: jest.fn() }));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const fetchMock = fetchProfile as jest.MockedFunction<typeof fetchProfile>;
const isOnlineMock = isOnline as jest.MockedFunction<typeof isOnline>;
const updateMock = updateProfile as jest.MockedFunction<typeof updateProfile>;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const SESSION = {
  idToken: 'id-token',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

const ACCOUNT: Account = {
  id: 'user-1',
  name: 'Eduardo Ferrari',
  email: 'eduardo@example.com',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

const NEW_USER: Profile = {
  id: 'user-1',
  name: 'Eduardo Ferrari',
  email: 'eduardo@example.com',
  crmv: null,
  birthDate: null,
  sex: null,
  city: null,
  state: null,
};

const FILLED_IN: Profile = {
  ...NEW_USER,
  crmv: 'RS-12345',
  birthDate: '1990-04-15T00:00:00.000Z',
  sex: 'FEMALE',
  city: 'Porto Alegre',
  state: 'RS',
};

const CRMV_NOTICE =
  'O CRMV é necessário para emitir relatórios com identificação profissional.';
const STALE_NOTICE =
  'Mostrando os últimos dados salvos. Eles podem estar desatualizados.';

async function renderScreen(onClose = jest.fn()) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <ProfileScreen visible onClose={onClose} />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });

  return renderer;
}

function texts(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .flatMap(node => node.props.children);
}

function field(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  const row = renderer.root.findAll(node =>
    String(node.props.accessibilityLabel).startsWith(`${label}: `),
  )[0];
  return String(row.props.accessibilityLabel).slice(label.length + 2);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useFakeTimers({
    doNotFake: ['setImmediate', 'nextTick', 'queueMicrotask'],
  });
  jest.setSystemTime(new Date(2026, 10, 4, 12));
  fetchMock.mockReset();
  updateMock.mockReset();
  isOnlineMock.mockReset();
  isOnlineMock.mockResolvedValue(true);
});

afterEach(() => {
  jest.useRealTimers();
});

it('shows a new user with what is missing marked as not informed', async () => {
  fetchMock.mockResolvedValue(NEW_USER);

  const renderer = await renderScreen();

  expect(field(renderer, 'Nome')).toBe('Eduardo Ferrari');
  expect(field(renderer, 'Email')).toBe('eduardo@example.com');
  for (const label of ['CRMV', 'Idade', 'Sexo', 'Cidade', 'Estado']) {
    expect(field(renderer, label)).toBe('Não informado');
  }
  expect(texts(renderer)).toContain('EF');
});

it('shows every field of a filled-in profile, with the age worked out', async () => {
  fetchMock.mockResolvedValue(FILLED_IN);

  const renderer = await renderScreen();

  expect(field(renderer, 'CRMV')).toBe('RS-12345');
  expect(field(renderer, 'Idade')).toBe('36 anos');
  expect(field(renderer, 'Sexo')).toBe('Feminino');
  expect(field(renderer, 'Cidade')).toBe('Porto Alegre');
  expect(field(renderer, 'Estado')).toBe('RS');
});

it('tells an explicit choice not to answer from a field never filled in', async () => {
  fetchMock.mockResolvedValue({ ...FILLED_IN, sex: 'NOT_INFORMED' });

  const renderer = await renderScreen();

  expect(field(renderer, 'Sexo')).toBe('Prefiro não informar');
});

it.each([
  ['warns', null, true],
  ['says nothing', 'RS-12345', false],
])('%s about the CRMV when it is %s', async (_case, crmv, warns) => {
  fetchMock.mockResolvedValue({ ...FILLED_IN, crmv });

  const renderer = await renderScreen();

  expect(texts(renderer).includes(CRMV_NOTICE)).toBe(warns);
});

it('has no outdated notice on a fresh profile', async () => {
  fetchMock.mockResolvedValue(FILLED_IN);

  const renderer = await renderScreen();

  expect(texts(renderer)).not.toContain(STALE_NOTICE);
});

it('shows the saved profile with a notice when offline', async () => {
  isOnlineMock.mockResolvedValue(false);
  await saveCachedProfile('user-1', FILLED_IN);

  const renderer = await renderScreen();

  expect(field(renderer, 'Cidade')).toBe('Porto Alegre');
  expect(texts(renderer)).toContain(STALE_NOTICE);
});

it('offers to try again when there is nothing to show', async () => {
  isOnlineMock.mockResolvedValue(false);

  const renderer = await renderScreen();
  expect(texts(renderer)).toContain('Não foi possível carregar o perfil.');

  isOnlineMock.mockResolvedValue(true);
  fetchMock.mockResolvedValue(FILLED_IN);
  await act(async () => {
    renderer.root
      .findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          node.findAllByType('Text' as never).length > 0 &&
          node.findAllByType('Text' as never)[0].props.children ===
            'Tentar novamente',
      )
      .at(-1)!
      .props.onPress();
  });

  expect(field(renderer, 'Cidade')).toBe('Porto Alegre');
});

it('asks to sign in again when the session is rejected, with no retry', async () => {
  await saveCachedProfile('user-1', FILLED_IN);
  fetchMock.mockRejectedValue(new ApiError('expired', 'TOKEN_EXPIRED', 401));

  const renderer = await renderScreen();

  expect(texts(renderer)).toContain(
    'Sua sessão expirou. Saia da conta e entre novamente.',
  );
  expect(texts(renderer)).not.toContain(STALE_NOTICE);
  expect(texts(renderer)).not.toContain('Tentar novamente');
  expect(
    renderer.root.findAll(node =>
      String(node.props.accessibilityLabel).startsWith('Cidade: '),
    ),
  ).toHaveLength(0);
});

function pressable(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  return renderer.root
    .findAll(node => typeof node.props.onPress === 'function')
    .find(node =>
      node
        .findAllByType('Text' as never)
        .some(text => text.props.children === label),
    )!;
}

function input(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onChangeText === 'function',
  )[0];
}

async function openEditing() {
  fetchMock.mockResolvedValue(FILLED_IN);
  const renderer = await renderScreen();
  await act(async () => pressable(renderer, 'Editar perfil').props.onPress());
  return renderer;
}

async function type(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
  text: string,
) {
  await act(async () => input(renderer, label).props.onChangeText(text));
}

function isSaveEnabled(renderer: ReactTestRenderer.ReactTestRenderer) {
  return !pressable(renderer, 'Salvar').props.disabled;
}

it('opens the edit form filled with the current values', async () => {
  const renderer = await openEditing();

  expect(input(renderer, 'Nome').props.value).toBe('Eduardo Ferrari');
  expect(input(renderer, 'CRMV').props.value).toBe('RS-12345');
  expect(input(renderer, 'Data de nascimento').props.value).toBe('15/04/1990');
  expect(input(renderer, 'Cidade').props.value).toBe('Porto Alegre');
  expect(texts(renderer)).toContain(
    'O e-mail vem do seu login e não é alterado aqui.',
  );
});

it('keeps saving off with no change and while a field is invalid', async () => {
  const renderer = await openEditing();
  expect(isSaveEnabled(renderer)).toBe(false);

  await type(renderer, 'CRMV', 'rs');
  expect(texts(renderer)).toContain('Use o formato UF-número, como RS-12345.');
  expect(isSaveEnabled(renderer)).toBe(false);

  await type(renderer, 'CRMV', 'rs54321');
  expect(input(renderer, 'CRMV').props.value).toBe('RS-54321');
  expect(isSaveEnabled(renderer)).toBe(true);
});

it('saves, confirms and shows the new data', async () => {
  updateMock.mockResolvedValue({ ...FILLED_IN, city: 'Canoas' });
  const renderer = await openEditing();

  await type(renderer, 'Cidade', 'Canoas');
  await act(async () => pressable(renderer, 'Salvar').props.onPress());

  expect(updateMock).toHaveBeenCalledWith('id-token', {
    name: 'Eduardo Ferrari',
    crmv: 'RS-12345',
    birthDate: '1990-04-15',
    sex: 'FEMALE',
    city: 'Canoas',
    state: 'RS',
  });
  expect(texts(renderer)).toContain('Perfil atualizado.');
  expect(field(renderer, 'Cidade')).toBe('Canoas');

  await act(async () => {
    jest.advanceTimersByTime(3000);
  });
  expect(texts(renderer)).not.toContain('Perfil atualizado.');
});

it('keeps the form and says so when saving fails', async () => {
  updateMock.mockRejectedValue(new ApiError('boom', 'INTERNAL', 500));
  const renderer = await openEditing();

  await type(renderer, 'Cidade', 'Canoas');
  await act(async () => pressable(renderer, 'Salvar').props.onPress());

  expect(texts(renderer)).toContain(
    'Não foi possível salvar o perfil. Tente de novo.',
  );
  expect(input(renderer, 'Cidade').props.value).toBe('Canoas');
});

it('drops the changes on cancel, back to the previous values', async () => {
  const renderer = await openEditing();

  await type(renderer, 'Cidade', 'Canoas');
  await act(async () => pressable(renderer, 'Cancelar').props.onPress());

  expect(updateMock).not.toHaveBeenCalled();
  expect(field(renderer, 'Cidade')).toBe('Porto Alegre');

  await act(async () => pressable(renderer, 'Editar perfil').props.onPress());
  expect(input(renderer, 'Cidade').props.value).toBe('Porto Alegre');
});

const PENDING_NOTICE =
  'Sem conexão. As alterações do perfil foram salvas no aparelho e serão enviadas quando houver internet.';
const REJECTED_NOTICE =
  'A alteração do perfil feita sem conexão foi recusada. Os dados voltaram aos últimos salvos.';

it('saves on the device without a connection and says it is waiting to be sent', async () => {
  const renderer = await openEditing();
  isOnlineMock.mockResolvedValue(false);

  await type(renderer, 'Cidade', 'Canoas');
  await act(async () => pressable(renderer, 'Salvar').props.onPress());

  expect(updateMock).not.toHaveBeenCalled();
  expect(field(renderer, 'Cidade')).toBe('Canoas');
  expect(texts(renderer)).toContain(PENDING_NOTICE);
  expect(texts(renderer)).not.toContain('Perfil atualizado.');
  expect((await loadPendingProfileEdit('user-1'))?.update.city).toBe('Canoas');
});

it('tells that an offline edit was refused until it is dismissed', async () => {
  await saveProfileRejected('user-1', true);
  fetchMock.mockResolvedValue(FILLED_IN);

  const renderer = await renderScreen();
  expect(texts(renderer)).toContain(REJECTED_NOTICE);

  await act(async () => pressable(renderer, 'Entendi').props.onPress());
  expect(texts(renderer)).not.toContain(REJECTED_NOTICE);
});

it('goes back', async () => {
  fetchMock.mockResolvedValue(FILLED_IN);
  const onClose = jest.fn();

  const renderer = await renderScreen(onClose);
  await act(async () => {
    renderer.root
      .findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          node.props.accessibilityLabel === 'Voltar',
      )[0]
      .props.onPress();
  });

  expect(onClose).toHaveBeenCalled();
});
