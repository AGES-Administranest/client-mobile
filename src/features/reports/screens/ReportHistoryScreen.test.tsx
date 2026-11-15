import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { ReportHistoryScreen } from './ReportHistoryScreen';
import { ReportCard } from '../components/ReportCard';
import type { ReportHistoryItem } from '../domain/report.types';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const SAVED: ReportHistoryItem = {
  id: 'report-1',
  fileName: 'saved.pdf',
  generatedAt: '2026-11-12T00:00:00Z',
  fileUri: 'file:///saved.pdf',
};
const DOWNLOADED: ReportHistoryItem = {
  id: 'report-2',
  fileName: 'downloaded.pdf',
  generatedAt: '2026-11-13T00:00:00Z',
};

async function render(
  props: Partial<Parameters<typeof ReportHistoryScreen>[0]> = {},
) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <ReportHistoryScreen
            visible
            items={[SAVED, DOWNLOADED]}
            onClose={jest.fn()}
            shareActionOf={report => (report.fileUri ? jest.fn() : undefined)}
            {...props}
          />
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });
  return renderer;
}

describe('ReportHistoryScreen', () => {
  it('makes only the reports saved on the device pressable', async () => {
    const renderer = await render();

    const cards = renderer.root.findAllByType(ReportCard);
    expect(cards.map(card => typeof card.props.onPress)).toEqual([
      'function',
      'undefined',
    ]);
  });

  it('shows a failed share inside the history itself', async () => {
    const renderer = await render({
      shareError: 'Não foi possível compartilhar o relatório.',
    });

    expect(JSON.stringify(renderer.toJSON())).toContain(
      'Não foi possível compartilhar o relatório.',
    );
  });
});
