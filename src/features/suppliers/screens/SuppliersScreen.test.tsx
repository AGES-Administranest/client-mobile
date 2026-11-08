import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION } from 'features/auth';
import { I18nProvider } from 'shared/i18n';

import { SuppliersScreen } from './SuppliersScreen';
import { loadSupplierOutbox } from '../services/offlineSupplierStore';

jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

// Backend de mentira em memória, com o formato das respostas de /supplier.
jest.mock('shared/services/apiClient', () => {
  let rows: Record<string, unknown>[] = [];
  const { ApiError } = jest.requireActual('shared/services/apiClient');
  return {
    ApiError,
    apiClient: {
      get: async (path: string) => {
        const wanted = path.includes('active=true');
        return rows.filter(row => row.active === wanted);
      },
      post: async (_path: string, body: { taxId?: string }) => {
        if ((body as { name?: string }).name === 'Vet Offline') {
          throw new TypeError('Network request failed');
        }
        if (body.taxId && rows.some(row => row.taxId === body.taxId)) {
          throw new ApiError('dup', 'DUPLICATED_SUPPLIER_TAX_ID', 409);
        }
        const row = { id: `s${rows.length + 1}`, active: true, ...body };
        rows = [...rows, row];
        return row;
      },
      patch: async (path: string, body: object) => {
        const id = path.split('/').pop();
        rows = rows.map(row => (row.id === id ? { ...row, ...body } : row));
        return rows.find(row => row.id === id);
      },
      delete: async (path: string) => {
        const id = path.split('/').pop();
        rows = rows.map(row =>
          row.id === id ? { ...row, active: false } : row,
        );
      },
    },
  };
});

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

type Renderer = ReactTestRenderer.ReactTestRenderer;

async function renderScreen() {
  let renderer: Renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider
            initialSession={{
              idToken: 'id-token',
              accessToken: 'access',
              refreshToken: 'refresh',
              expiresAt: 1,
            }}
            initialAccount={{
              id: 'user-1',
              name: 'Bruna Senha',
              email: 'bruna@example.com',
              termsAcceptedAt: '2026-09-13T12:00:00.000Z',
              termsVersion: TERMS_VERSION,
            }}
          >
            <SuppliersScreen />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });
  return renderer!;
}

const textsOf = (renderer: Renderer) =>
  JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );

function pressByText(renderer: Renderer, label: string) {
  // O mais interno: o fundo de um diálogo também tem onPress e contém o texto.
  const button = renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      node
        .findAllByType('Text' as never)
        .some(text => text.props.children === label),
  );
  return act(async () => {
    button.at(-1)!.props.onPress();
  });
}

function typeInto(renderer: Renderer, label: string, value: string) {
  const [input] = renderer.root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onChangeText === 'function',
  );
  return act(async () => {
    input.props.onChangeText(value);
  });
}

test('creates, edits, deactivates and deletes a supplier', async () => {
  const renderer = await renderScreen();
  expect(textsOf(renderer)).toContain('Nenhum fornecedor cadastrado.');

  await pressByText(renderer, 'Adicionar fornecedor');
  await pressByText(renderer, 'Confirmar');
  expect(textsOf(renderer)).toContain('Informe o nome do fornecedor.');

  await typeInto(renderer, 'Nome do fornecedor', 'PetCare Central');
  await typeInto(renderer, 'CNPJ', '11.222.333/0001-81');
  await typeInto(renderer, 'Contato', '(11) 93456-7890');
  await pressByText(renderer, 'Confirmar');
  let texts = textsOf(renderer);
  expect(texts).toContain('1 fornecedor');
  expect(texts).toContain('PetCare Central');
  expect(texts).toContain('(11) 93456-7890');

  await pressByText(renderer, 'PetCare Central');
  expect(textsOf(renderer)).toContain('Editar Fornecedor');

  await pressByText(renderer, 'Editar Fornecedor');
  await typeInto(renderer, 'Nome do fornecedor', 'PetCare Sul');
  await pressByText(renderer, 'Desativo');
  await pressByText(renderer, 'Confirmar');
  expect(textsOf(renderer)).toContain('Desativar fornecedor?');
  await pressByText(renderer, 'Desativar');
  texts = textsOf(renderer);
  expect(texts).toContain('PetCare Sul');
  expect(texts).not.toContain('PetCare Central');

  await pressByText(renderer, 'PetCare Sul');
  expect(textsOf(renderer)).toContain('Desativo');

  await pressByText(renderer, 'Editar Fornecedor');
  await pressByText(renderer, 'Excluir');
  texts = textsOf(renderer);
  expect(texts).toContain('PetCare Sul');
  expect(texts).toContain('Desativo');
});

test('refuses a second supplier with the same CNPJ', async () => {
  const renderer = await renderScreen();
  for (const name of ['PetCare Norte', 'PetCare Leste']) {
    await pressByText(renderer, 'Adicionar fornecedor');
    await typeInto(renderer, 'Nome do fornecedor', name);
    await typeInto(renderer, 'CNPJ', '11.444.777/0001-61');
    await pressByText(renderer, 'Confirmar');
  }
  const texts = textsOf(renderer);
  expect(texts).toContain('Já existe um fornecedor com esse CNPJ.');
  expect(texts).toContain('PetCare Norte');
  expect(texts).not.toContain('PetCare Leste');
});

test('keeps the supplier active when the deactivation is cancelled', async () => {
  const renderer = await renderScreen();
  await pressByText(renderer, 'Adicionar fornecedor');
  await typeInto(renderer, 'Nome do fornecedor', 'Vet Oeste');
  await pressByText(renderer, 'Confirmar');
  await pressByText(renderer, 'Vet Oeste');
  await pressByText(renderer, 'Editar Fornecedor');
  await pressByText(renderer, 'Desativo');
  await pressByText(renderer, 'Confirmar');
  expect(textsOf(renderer)).toContain('Desativar fornecedor?');

  await pressByText(renderer, 'Cancelar');
  expect(textsOf(renderer)).not.toContain('Desativar fornecedor?');
  await pressByText(renderer, 'Excluir');
  expect(textsOf(renderer)).toContain('Desativar fornecedor?');
});

test('registers a supplier without a connection and keeps it in the send queue', async () => {
  const renderer = await renderScreen();
  await pressByText(renderer, 'Adicionar fornecedor');
  await typeInto(renderer, 'Nome do fornecedor', 'Vet Offline');
  await pressByText(renderer, 'Confirmar');

  expect(textsOf(renderer)).toContain('Vet Offline');
  const outbox = await loadSupplierOutbox('user-1');
  expect(outbox).toHaveLength(1);
  expect(outbox[0]).toMatchObject({
    kind: 'create',
    payload: { name: 'Vet Offline' },
  });
});
