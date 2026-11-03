import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { I18nProvider } from 'shared/i18n';

import { ServiceInvoicesSection } from './ServiceInvoicesSection';
import type { ServiceInvoice } from '../domain/serviceInvoice';
import { fetchServiceInvoices } from '../services/serviceInvoiceService';

jest.mock('../services/serviceInvoiceService', () => ({
  MAX_PAGE_SIZE: 100,
  fetchServiceInvoices: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const fetchMock = fetchServiceInvoices as jest.MockedFunction<
  typeof fetchServiceInvoices
>;

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
  name: 'Bruna Senha',
  email: 'bruna@example.com',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

const WITH_FILE: ServiceInvoice = {
  id: 'invoice-1',
  issueDate: '2026-04-22',
  takerName: 'HospVet Sul',
  hasOriginalFile: true,
};

const WITHOUT_FILE: ServiceInvoice = {
  id: 'invoice-2',
  issueDate: null,
  takerName: null,
  hasOriginalFile: false,
};

async function renderSection() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <ServiceInvoicesSection />
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

async function press(
  renderer: ReactTestRenderer.ReactTestRenderer,
  role: 'button' | 'link',
) {
  const target = renderer.root.findAll(
    node =>
      node.props.accessibilityRole === role &&
      node.props.accessibilityLabel === undefined,
  )[0];
  await act(async () => target.props.onPress());
}

beforeEach(() => {
  fetchMock.mockReset();
});

test('asks for the few most recent notes with the session token', async () => {
  fetchMock.mockResolvedValue([WITH_FILE]);

  await renderSection();

  expect(fetchMock).toHaveBeenCalledWith(SESSION.idToken, 5);
});

test('shows the title, the see-all link and a card per note', async () => {
  fetchMock.mockResolvedValue([WITH_FILE]);

  const shown = texts(await renderSection());

  expect(shown).toContain('Notas fiscais');
  expect(shown).toContain('Ver todos');
  expect(shown).toContain('HospVet Sul');
  expect(shown).toContain('22/04/2026');
  expect(shown).toContain('Arquivo original');
});

test('marks the original file only on the notes that have it', async () => {
  fetchMock.mockResolvedValue([WITH_FILE, WITHOUT_FILE]);

  const renderer = await renderSection();

  expect(texts(renderer).match(/Arquivo original/g)).toHaveLength(1);
});

test('names a missing taker and a missing issue date', async () => {
  fetchMock.mockResolvedValue([WITHOUT_FILE]);

  const shown = texts(await renderSection());

  expect(shown).toContain('Sem tomador');
  expect(shown).toContain('Sem data de emissão');
});

test('shows the empty message when there is no note', async () => {
  fetchMock.mockResolvedValue([]);

  const shown = texts(await renderSection());

  expect(shown).toContain('Nenhuma nota fiscal registrada ainda.');
});

test('shows an error message when loading fails', async () => {
  fetchMock.mockRejectedValue(new Error('offline'));

  const shown = texts(await renderSection());

  expect(shown).toContain('Não foi possível carregar as notas fiscais.');
});

test('shows a loading indicator while the notes are coming', async () => {
  fetchMock.mockReturnValue(new Promise(() => undefined));

  const renderer = await renderSection();

  expect(
    renderer.root.findAll(
      node => node.props.accessibilityLabel === 'Carregando notas fiscais',
    ).length,
  ).toBeGreaterThan(0);
});

test('opens no sheet before a tap', async () => {
  fetchMock.mockResolvedValue([WITH_FILE]);

  const shown = texts(await renderSection());

  expect(shown).not.toContain('Detalhes da nota');
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('tapping a card opens the detail of that note', async () => {
  fetchMock.mockResolvedValue([WITH_FILE]);
  const renderer = await renderSection();

  await press(renderer, 'button');

  const shown = texts(renderer);
  expect(shown).toContain('Detalhes da nota');
  expect(shown).toContain('Tomador');
  expect(shown).toContain('Disponível');
});

test('the detail says when the original file is unavailable', async () => {
  fetchMock.mockResolvedValue([WITHOUT_FILE]);
  const renderer = await renderSection();

  await press(renderer, 'button');

  expect(texts(renderer)).toContain('Indisponível');
});

test('tapping "Ver todos" opens the full list, asking for the biggest page', async () => {
  fetchMock.mockResolvedValue([WITH_FILE]);
  const renderer = await renderSection();

  await press(renderer, 'link');

  expect(fetchMock).toHaveBeenCalledWith(SESSION.idToken, 100);
});
