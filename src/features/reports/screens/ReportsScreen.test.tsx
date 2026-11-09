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

const REAL_TIMERS = [
  'hrtime',
  'nextTick',
  'performance',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'requestIdleCallback',
  'cancelIdleCallback',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'setTimeout',
  'clearTimeout',
] as const;

// The default period is built from today, so the date is pinned; only Date
// is faked, timers stay real.
beforeAll(() => {
  jest.useFakeTimers({
    now: new Date(Date.UTC(2026, 10, 2, 15)),
    doNotFake: [...REAL_TIMERS],
  });
});

afterAll(() => {
  jest.useRealTimers();
});

// The cards and the history link only work when the app wires the callbacks,
// so the tests wire them unless a case says otherwise.
async function render(props: React.ComponentProps<typeof ReportsScreen> = {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <I18nProvider>
          <ReportsScreen
            onGenerateReport={jest.fn()}
            onOpenHistory={jest.fn()}
            {...props}
          />
        </I18nProvider>
      </SafeAreaProvider>,
    );
  });

  return renderer!;
}

function pressable(
  renderer: ReactTestRenderer.ReactTestRenderer,
  match: (label: string) => boolean,
) {
  return renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      match(node.props.accessibilityLabel ?? ''),
  )[0];
}

function tab(renderer: ReactTestRenderer.ReactTestRenderer, name: string) {
  return renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'tab' &&
      typeof node.props.onPress === 'function' &&
      node
        .findAllByType('Text' as never)
        .some(text => text.props.children === name),
  )[0];
}

async function press(instance: ReactTestRenderer.ReactTestInstance) {
  await act(() => {
    instance.props.onPress();
  });
}

function dayCell(renderer: ReactTestRenderer.ReactTestRenderer, date: string) {
  return renderer.root.find(
    node =>
      node.props.testID === date && typeof node.props.onPress === 'function',
  );
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(renderer.toJSON());
}

function dateField(
  renderer: ReactTestRenderer.ReactTestRenderer,
  name: string,
) {
  return pressable(renderer, label => label.startsWith(`${name}: `));
}

function dateFieldLabels(renderer: ReactTestRenderer.ReactTestRenderer) {
  return [
    dateField(renderer, 'Data de início').props.accessibilityLabel,
    dateField(renderer, 'Data de fim').props.accessibilityLabel,
  ];
}

function isCalendarShown(renderer: ReactTestRenderer.ReactTestRenderer) {
  return (
    renderer.root.findAll(node => node.props.testID === '2026-11-10').length > 0
  );
}

describe('ReportsScreen', () => {
  it('shows the two report cards, the period and the history access', async () => {
    const renderer = await render();
    const output = textsOf(renderer);

    expect(output).toContain('Relatório Geral');
    expect(output).toContain('Pacote de Notas Fiscais para IR');
    expect(dateFieldLabels(renderer)).toEqual([
      'Data de início: 01/11/2026',
      'Data de fim: 02/11/2026',
    ]);
    expect(output).toContain('Histórico de relatórios');
  });

  it('shows the recent invoices section below the report history', async () => {
    const output = textsOf(await render());

    expect(output).toContain('Notas fiscais');
    expect(output).toContain('HospVet Sul');
    expect(output.indexOf('Histórico de relatórios')).toBeLessThan(
      output.indexOf('HospVet Sul'),
    );
  });

  it.each([
    ['Relatório Geral', 'general'],
    ['Pacote de Notas Fiscais para IR', 'invoicePackage'],
  ])('%s hands the chosen period to the caller', async (title, kind) => {
    const onGenerateReport = jest.fn();
    const renderer = await render({ onGenerateReport });

    await press(pressable(renderer, label => label === title));

    expect(onGenerateReport).toHaveBeenCalledWith(kind, {
      from: '2026-11-01',
      to: '2026-11-02',
    });
  });

  it.each([
    ['Mês atual', '01/11/2026', '02/11/2026', '2026-11-01', '2026-11-02'],
    ['Mês anterior', '01/10/2026', '31/10/2026', '2026-10-01', '2026-10-31'],
    ['Ano atual', '01/01/2026', '02/11/2026', '2026-01-01', '2026-11-02'],
  ])(
    'the %s shortcut fills both date fields and sends YYYY-MM-DD',
    async (name, start, end, from, to) => {
      const onGenerateReport = jest.fn();
      const renderer = await render({ onGenerateReport });

      await press(tab(renderer, name));

      expect(dateFieldLabels(renderer)).toEqual([
        `Data de início: ${start}`,
        `Data de fim: ${end}`,
      ]);
      expect(isCalendarShown(renderer)).toBe(false);

      await press(pressable(renderer, title => title === 'Relatório Geral'));

      expect(onGenerateReport).toHaveBeenCalledWith('general', { from, to });
    },
  );

  it('shows the calendar only for the custom period', async () => {
    const renderer = await render();

    expect(isCalendarShown(renderer)).toBe(false);

    await press(tab(renderer, 'Personalizado'));

    expect(isCalendarShown(renderer)).toBe(true);

    await press(tab(renderer, 'Mês atual'));

    expect(isCalendarShown(renderer)).toBe(false);
  });

  it.each(['Data de início', 'Data de fim'])(
    'a tap on %s moves to the custom period and keeps the dates',
    async name => {
      const renderer = await render();

      await press(dateField(renderer, name));

      expect(
        tab(renderer, 'Personalizado').props.accessibilityState.selected,
      ).toBe(true);
      expect(isCalendarShown(renderer)).toBe(true);
      expect(dateFieldLabels(renderer)).toEqual([
        'Data de início: 01/11/2026',
        'Data de fim: 02/11/2026',
      ]);
    },
  );

  it('blocks the days after today in the calendar', async () => {
    const renderer = await render();

    await press(tab(renderer, 'Personalizado'));

    const tomorrow = renderer.root.find(
      node =>
        node.props.testID === '2026-11-03' &&
        'accessibilityState' in node.props,
    );
    expect(tomorrow.props.disabled).toBe(true);
    expect(dayCell(renderer, '2026-11-02')).toBeDefined();
  });

  it('keeps the cards disabled until the custom period has both ends', async () => {
    const renderer = await render();
    const generalCard = () =>
      pressable(renderer, label => label === 'Relatório Geral');

    await press(tab(renderer, 'Personalizado'));
    await press(dayCell(renderer, '2026-11-01'));

    expect(dateFieldLabels(renderer)).toEqual([
      'Data de início: 01/11/2026',
      'Data de fim: Selecione',
    ]);
    expect(generalCard().props.disabled).toBe(true);

    await press(dayCell(renderer, '2026-11-02'));

    expect(generalCard().props.disabled).toBe(false);
    expect(dateFieldLabels(renderer)).toEqual([
      'Data de início: 01/11/2026',
      'Data de fim: 02/11/2026',
    ]);
  });

  it('disables the report cards and hides the history while nothing is wired', async () => {
    const renderer = await render({
      onGenerateReport: undefined,
      onOpenHistory: undefined,
    });

    expect(
      pressable(renderer, label => label === 'Relatório Geral').props.disabled,
    ).toBe(true);
    expect(
      pressable(renderer, label => label === 'Pacote de Notas Fiscais para IR')
        .props.disabled,
    ).toBe(true);
    expect(textsOf(renderer)).not.toContain('Histórico de relatórios');
  });

  it('opens the history', async () => {
    const onOpenHistory = jest.fn();
    const renderer = await render({ onOpenHistory });

    await press(
      pressable(
        renderer,
        label => label.includes('Ver todos') && label.includes('Histórico'),
      ),
    );

    expect(onOpenHistory).toHaveBeenCalledTimes(1);
  });
});
