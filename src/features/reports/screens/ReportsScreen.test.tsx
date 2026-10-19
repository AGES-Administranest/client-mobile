import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { I18nProvider } from 'shared/i18n';

import { ReportsScreen } from './ReportsScreen';

jest.mock('features/serviceInvoices/services/serviceInvoiceService', () => ({
  fetchRecentServiceInvoices: jest.fn(async () => [
    {
      id: 'invoice-1',
      issueDate: '2026-04-22',
      clientName: 'HospVet Sul',
      hasOriginalFile: true,
    },
  ]),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

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

function DetailStub({ invoiceId }: { invoiceId: string; onClose: () => void }) {
  return <Text>{`detail:${invoiceId}`}</Text>;
}

function ListStub() {
  return <Text>list</Text>;
}

async function renderReports() {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
          <ReportsScreen
            InvoiceDetailScreen={DetailStub}
            InvoiceListScreen={ListStub}
          />
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

async function press(
  renderer: ReactTestRenderer.ReactTestRenderer,
  role: 'button' | 'link',
) {
  const target = renderer.root.findAll(
    node => node.props.accessibilityRole === role,
  )[0];
  await act(async () => target.props.onPress());
}

test('shows the invoices section under the title', async () => {
  const shown = texts(await renderReports());

  expect(shown).toContain('Relatórios');
  expect(shown).toContain('Notas fiscais');
  expect(shown).toContain('HospVet Sul');
});

test('tapping a card opens the detail of that invoice', async () => {
  const renderer = await renderReports();

  await press(renderer, 'button');

  expect(texts(renderer)).toContain('detail:invoice-1');
});

test('tapping "Ver todos" opens the full list', async () => {
  const renderer = await renderReports();

  await press(renderer, 'link');

  expect(texts(renderer)).toContain('list');
});

test('opens nothing before a tap', async () => {
  const shown = texts(await renderReports());

  expect(shown).not.toContain('detail:invoice-1');
  expect(shown).not.toContain('"list"');
});
