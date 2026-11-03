import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { ReportsScreen } from './ReportsScreen';

jest.mock('features/auth', () => ({
  useAuth: () => ({ session: { idToken: 'tok' } }),
}));

jest.mock('features/invoices/services/reportInvoiceService', () => ({
  fetchReportInvoices: jest.fn(async () => [
    {
      id: 'invoice-1',
      issueDate: '2026-04-22',
      takerName: 'HospVet Sul',
      hasOriginalFile: true,
    },
  ]),
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

test('shows the title and the recent invoices section', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <ReportsScreen />
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
