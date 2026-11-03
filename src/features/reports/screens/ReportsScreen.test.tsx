import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { ReportsScreen } from './ReportsScreen';

jest.mock('features/auth', () => ({
  useAuth: () => ({ session: { idToken: 'tok' } }),
}));

jest.mock('features/invoices/services/invoiceService', () => ({
  fetchInvoices: jest.fn(async () => ({
    items: [
      {
        id: 'invoice-1',
        number: '000458',
        kind: 'SERVICE',
        issuerName: 'Vet Farma',
        takerName: 'HospVet Sul',
        takerCnpj: '12.345.678/0001-90',
        amount: 100,
        issuedAt: '2026-04-22T12:00:00.000Z',
        syncStatus: 'SYNCED',
        hasOriginalFile: true,
      },
    ],
    hasMore: false,
  })),
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
