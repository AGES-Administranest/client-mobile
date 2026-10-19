import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { I18nProvider } from 'shared/i18n';

import { ServiceInvoicesSection } from './ServiceInvoicesSection';
import type { ServiceInvoice } from '../domain/serviceInvoice';
import { fetchRecentServiceInvoices } from '../services/serviceInvoiceService';

jest.mock('../services/serviceInvoiceService', () => ({
  fetchRecentServiceInvoices: jest.fn(),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const fetchMock = fetchRecentServiceInvoices as jest.MockedFunction<
  typeof fetchRecentServiceInvoices
>;

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
  clientName: 'HospVet Sul',
  hasOriginalFile: true,
};

const WITHOUT_FILE: ServiceInvoice = {
  id: 'invoice-2',
  issueDate: null,
  clientName: null,
  hasOriginalFile: false,
};

async function renderSection(
  props: Parameters<typeof ServiceInvoicesSection>[0] = {},
) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
          <ServiceInvoicesSection {...props} />
        </AuthProvider>
      </I18nProvider>,
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

beforeEach(() => {
  fetchMock.mockReset();
});

test('asks for the recent invoices with the session token', async () => {
  fetchMock.mockResolvedValue([WITH_FILE]);

  await renderSection();

  expect(fetchMock).toHaveBeenCalledWith(SESSION.idToken, expect.any(Number));
});

test('shows the title, the see-all link and a card per invoice', async () => {
  fetchMock.mockResolvedValue([WITH_FILE]);

  const renderer = await renderSection();
  const shown = texts(renderer);

  expect(shown).toContain('Notas fiscais');
  expect(shown).toContain('Ver todos');
  expect(shown).toContain('HospVet Sul');
  expect(shown).toContain('22/04/2026');
  expect(shown).toContain('Arquivo original');
});

test('marks the original file only on the invoices that have it', async () => {
  fetchMock.mockResolvedValue([WITH_FILE, WITHOUT_FILE]);

  const renderer = await renderSection();

  expect(texts(renderer).match(/Arquivo original/g)).toHaveLength(1);
});

test('names a missing borrower and a missing issue date', async () => {
  fetchMock.mockResolvedValue([WITHOUT_FILE]);

  const shown = texts(await renderSection());

  expect(shown).toContain('Sem tomador');
  expect(shown).toContain('Sem data de emissão');
});

test('shows the empty message when there is no invoice', async () => {
  fetchMock.mockResolvedValue([]);

  const shown = texts(await renderSection());

  expect(shown).toContain('Nenhuma nota fiscal registrada ainda.');
});

test('shows an error message when loading fails', async () => {
  fetchMock.mockRejectedValue(new Error('offline'));

  const shown = texts(await renderSection());

  expect(shown).toContain('Não foi possível carregar as notas fiscais.');
});

test('tapping a card opens that invoice', async () => {
  fetchMock.mockResolvedValue([WITH_FILE]);
  const onOpenInvoice = jest.fn();

  const renderer = await renderSection({ onOpenInvoice });
  const card = renderer.root.findAll(
    node => node.props.accessibilityRole === 'button',
  )[0];
  await act(async () => card.props.onPress());

  expect(onOpenInvoice).toHaveBeenCalledWith('invoice-1');
});

test('tapping "Ver todos" opens the full list', async () => {
  fetchMock.mockResolvedValue([WITH_FILE]);
  const onSeeAll = jest.fn();

  const renderer = await renderSection({ onSeeAll });
  const link = renderer.root.findAll(
    node => node.props.accessibilityRole === 'link',
  )[0];
  await act(async () => link.props.onPress());

  expect(onSeeAll).toHaveBeenCalledTimes(1);
});
