import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import { I18nProvider } from 'shared/i18n';

import { ReportsScreen } from './ReportsScreen';

jest.mock('features/serviceInvoices/services/serviceInvoiceService', () => ({
  MAX_PAGE_SIZE: 100,
  fetchServiceInvoices: jest.fn(async () => [
    {
      id: 'invoice-1',
      issueDate: '2026-04-22',
      takerName: 'HospVet Sul',
      hasOriginalFile: true,
    },
  ]),
}));
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

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

test('shows the title and the invoices section', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
            <ReportsScreen />
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });

  const shown = JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );
  expect(shown).toContain('Relatórios');
  expect(shown).toContain('Notas fiscais');
  expect(shown).toContain('HospVet Sul');
});
