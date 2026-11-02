import ReactTestRenderer, { act } from 'react-test-renderer';

import { I18nProvider } from 'shared/i18n';

import { ReportsScreen } from './ReportsScreen';

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
    now: new Date(2026, 10, 2, 12),
    doNotFake: [...REAL_TIMERS],
  });
});

afterAll(() => {
  jest.useRealTimers();
});

async function render(props: React.ComponentProps<typeof ReportsScreen> = {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <ReportsScreen {...props} />
      </I18nProvider>,
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

describe('ReportsScreen', () => {
  it('shows the two report cards, the period and the history access', async () => {
    const output = textsOf(await render());

    expect(output).toContain('Relatório Geral');
    expect(output).toContain('Pacote de Notas Fiscais para IR');
    expect(output).toContain('01/11/2026 até 02/11/2026');
    expect(output).toContain('Histórico de relatórios');
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

  it('keeps the cards disabled until the period has both ends', async () => {
    const renderer = await render();
    const generalCard = () =>
      pressable(renderer, label => label === 'Relatório Geral');

    await press(pressable(renderer, label => label.startsWith('Período')));
    await press(dayCell(renderer, '2026-11-10'));

    expect(textsOf(renderer)).toContain('Selecione o período');
    expect(generalCard().props.disabled).toBe(true);

    await press(dayCell(renderer, '2026-11-12'));

    expect(generalCard().props.disabled).toBe(false);
    expect(textsOf(renderer)).toContain('10/11/2026 até 12/11/2026');
  });

  it('opens the history', async () => {
    const onOpenHistory = jest.fn();
    const renderer = await render({ onOpenHistory });

    await press(pressable(renderer, label => label.includes('Ver todos')));

    expect(onOpenHistory).toHaveBeenCalledTimes(1);
  });
});
