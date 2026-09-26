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
import {
  createClient,
  deleteClient,
  fetchClinics,
  updateClient,
} from '../services/clientService';

jest.mock('../services/clientService', () => ({
  createClient: jest.fn(),
  deleteClient: jest.fn(),
  fetchClinics: jest.fn(),
  updateClient: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const createClientMock = createClient as jest.MockedFunction<
  typeof createClient
>;
const deleteClientMock = deleteClient as jest.MockedFunction<
  typeof deleteClient
>;
const fetchClinicsMock = fetchClinics as jest.MockedFunction<
  typeof fetchClinics
>;
const updateClientMock = updateClient as jest.MockedFunction<
  typeof updateClient
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
  taxId: '11222333000181',
  taxIdType: 'CNPJ',
  contactName: 'Dr. André Matos',
  email: 'contato@vetnova.com.br',
  phone: '1134567890',
  addressLine: 'Rua das Hortênsias, 340',
  city: 'Campinas',
  state: 'SP',
  serviceDays: [],
  paymentTermsDays: null,
  preferredPaymentMethod: null,
  active: true,
  createdAt: '2026-09-23T12:00:00.000Z',
  updatedAt: '2026-09-23T12:00:00.000Z',
};

beforeEach(() => {
  createClientMock.mockReset().mockResolvedValue(CREATED);
  deleteClientMock
    .mockReset()
    .mockResolvedValue({ id: CREATED.id, name: CREATED.name });
  fetchClinicsMock.mockReset().mockResolvedValue([]);
  updateClientMock.mockReset().mockImplementation((_token, id, payload) =>
    Promise.resolve({
      ...CREATED,
      id,
      name: payload.name ?? CREATED.name,
      city: payload.city ?? null,
    }),
  );
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

test('lists the clinics the backend returns', async () => {
  fetchClinicsMock.mockResolvedValue([CREATED]);

  const renderer = await render();

  expect(fetchClinicsMock).toHaveBeenCalledWith('id-token');
  expect(textsOf(renderer)).toContain('Clínica VetNova');
  expect(textsOf(renderer)).not.toContain('Nenhuma clínica cadastrada.');
});

test('says when the clinics could not be loaded', async () => {
  fetchClinicsMock.mockRejectedValue(new ApiError('boom', null, 500));

  const renderer = await render();

  expect(textsOf(renderer)).toContain('Não foi possível carregar as clínicas.');
});

async function fillClinic(
  renderer: ReactTestRenderer.ReactTestRenderer,
  name = 'Clínica VetNova',
) {
  await typeInto(renderer, 'Nome da clínica', name);
  await typeInto(renderer, 'CNPJ', '11222333000181');
  await typeInto(renderer, 'Endereço', 'Rua das Hortênsias, 340');
  await typeInto(renderer, 'Cidade', 'Campinas');
  await typeInto(renderer, 'UF', 'SP');
  await typeInto(renderer, 'Contato', '1134567890');
  await typeInto(renderer, 'E-mail', 'contato@vetnova.com.br');
  await typeInto(renderer, 'Responsável', 'Dr. André Matos');
}

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
  const shown = textsOf(renderer);
  expect(shown).toContain('Informe o nome da clínica.');
  expect(shown).toContain('Informe o CNPJ.');
  expect(shown).toContain('Informe o endereço.');
  expect(shown).toContain('Informe a cidade.');
  expect(shown).toContain('Informe a UF.');
  expect(shown).toContain('Informe o telefone.');
  expect(shown).toContain('Informe o e-mail.');
  expect(shown).toContain('Informe o nome do responsável.');
});

test('saves the clinic and closes the sheet', async () => {
  const renderer = await render();
  await press(renderer, 'Adicionar clínica');
  await fillClinic(renderer);

  await press(renderer, 'Confirmar');

  expect(createClientMock).toHaveBeenCalledWith('id-token', {
    type: 'CLINIC',
    name: 'Clínica VetNova',
    taxId: '11222333000181',
    taxIdType: 'CNPJ',
    addressLine: 'Rua das Hortênsias, 340',
    city: 'Campinas',
    state: 'SP',
    phone: '1134567890',
    email: 'contato@vetnova.com.br',
    contactName: 'Dr. André Matos',
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
  await fillClinic(renderer);

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

async function typeInto(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
  value: string,
) {
  await act(async () => {
    renderer.root
      .find(
        node =>
          node.props.accessibilityLabel === label &&
          typeof node.props.onChangeText === 'function',
      )
      .props.onChangeText(value);
  });
}

function inputLabels(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAll(
      node =>
        typeof node.props.onChangeText === 'function' &&
        node.props.accessibilityLabel !== undefined,
    )
    .map(node => node.props.accessibilityLabel);
}

async function renderWithCreatedClinic() {
  const renderer = await render();
  await press(renderer, 'Adicionar clínica');
  await fillClinic(renderer);
  await press(renderer, 'Confirmar');

  return renderer;
}

async function openDetails(renderer: ReactTestRenderer.ReactTestRenderer) {
  await act(async () => {
    renderer.root
      .find(
        node =>
          node.props.accessibilityRole === 'button' &&
          typeof node.props.onPress === 'function' &&
          node
            .findAllByType('Text' as never)
            .some(label => label.props.children === 'Clínica VetNova'),
      )
      .props.onPress();
  });
}

test('shows the details without the name field, since the name is the title', async () => {
  const renderer = await renderWithCreatedClinic();
  await openDetails(renderer);

  expect(new Set(inputLabels(renderer))).toEqual(
    new Set([
      'CNPJ',
      'Endereço',
      'Cidade',
      'UF',
      'Contato',
      'E-mail',
      'Responsável',
    ]),
  );
});

test('brings the name field back when editing the details', async () => {
  const renderer = await renderWithCreatedClinic();
  await openDetails(renderer);

  await press(renderer, 'Editar clínica');

  expect(inputLabels(renderer)).toContain('Nome da clínica');
});

test('validates the details when editing and keeps the clinic unchanged', async () => {
  const renderer = await renderWithCreatedClinic();
  await openDetails(renderer);
  await press(renderer, 'Editar clínica');

  await typeInto(renderer, 'CNPJ', '123');
  await typeInto(renderer, 'E-mail', '');
  await press(renderer, 'Confirmar');

  expect(textsOf(renderer)).toContain('O CNPJ informado não é válido.');
  expect(textsOf(renderer)).toContain('Informe o e-mail.');
  expect(textsOf(renderer)).toContain('Editar');
});

test('saves the edited clinic and shows it in the list', async () => {
  const renderer = await renderWithCreatedClinic();
  await openDetails(renderer);
  await press(renderer, 'Editar clínica');

  await typeInto(renderer, 'Nome da clínica', 'Vet Nova Sul');
  await typeInto(renderer, 'Cidade', 'São Paulo');
  await press(renderer, 'Confirmar');

  expect(updateClientMock).toHaveBeenCalledWith(
    'id-token',
    'client-1',
    expect.objectContaining({ name: 'Vet Nova Sul', city: 'São Paulo' }),
  );
  expect(textsOf(renderer)).toContain('Vet Nova Sul');
  expect(textsOf(renderer)).toContain('São Paulo, SP');
  expect(textsOf(renderer)).toContain('Editar clínica');
});

test('deletes the clinic from the details', async () => {
  const renderer = await renderWithCreatedClinic();
  await openDetails(renderer);
  await press(renderer, 'Editar clínica');

  await press(renderer, 'Excluir');

  expect(deleteClientMock).toHaveBeenCalledWith('id-token', 'client-1');
  expect(textsOf(renderer)).toContain('Nenhuma clínica cadastrada.');
});

test('keeps the clinic and explains when the backend refuses the edit', async () => {
  updateClientMock.mockRejectedValue(
    new ApiError('Duplicated', 'DUPLICATED_CLIENT_TAX_ID', 409),
  );
  const renderer = await renderWithCreatedClinic();
  await openDetails(renderer);
  await press(renderer, 'Editar clínica');

  await press(renderer, 'Confirmar');

  expect(textsOf(renderer)).toContain('Já existe uma clínica com esse CNPJ.');
  expect(textsOf(renderer)).toContain('Confirmar');
});

test('keeps the clinic listed when the delete fails', async () => {
  deleteClientMock.mockRejectedValue(new ApiError('boom', null, 500));
  const renderer = await renderWithCreatedClinic();
  await openDetails(renderer);
  await press(renderer, 'Editar clínica');

  await press(renderer, 'Excluir');

  expect(textsOf(renderer)).not.toContain('Nenhuma clínica cadastrada.');
  expect(textsOf(renderer)).toContain(
    'Não foi possível salvar a clínica. Tente novamente.',
  );
});
