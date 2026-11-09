import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  HistoryPeriodField,
  type HistoryPeriodFieldProps,
} from './HistoryPeriodField';

const AUGUST = { from: '2026-08-01', to: '2026-08-31' };

const PROPS: HistoryPeriodFieldProps = {
  texts: {
    label: 'Período',
    choosePeriod: 'Escolher período',
    previousMonth: 'Mês anterior',
    nextMonth: 'Próximo mês',
    currentMonth: 'Mês atual',
    apply: 'Aplicar',
  },
  locale: 'pt-BR',
  periodLabel: '01/08/2026 – 31/08/2026',
  isOpen: false,
  draft: AUGUST,
  canApply: true,
  onToggle: () => undefined,
  onChoose: () => undefined,
  onShowCurrentMonth: () => undefined,
  onApply: () => undefined,
};

async function render(overrides: Partial<HistoryPeriodFieldProps> = {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <HistoryPeriodField {...PROPS} {...overrides} />,
    );
  });

  return renderer!;
}

function pressableWithText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  text: string,
) {
  return renderer.root.find(
    node =>
      typeof node.props.onPress === 'function' &&
      node
        .findAllByType('Text' as never)
        .some(label => label.props.children === text),
  );
}

function day(renderer: ReactTestRenderer.ReactTestRenderer, date: string) {
  return renderer.root.findAll(
    node =>
      node.props.testID === date && typeof node.props.onPress === 'function',
  );
}

test('shows the period and opens the calendar on tap', async () => {
  const onToggle = jest.fn();
  const renderer = await render({ onToggle });

  expect(day(renderer, '2026-08-10')).toHaveLength(0);

  const field = pressableWithText(renderer, '01/08/2026 – 31/08/2026');
  expect(field.props.accessibilityState).toEqual({ expanded: false });
  await act(() => field.props.onPress());

  expect(onToggle).toHaveBeenCalledTimes(1);
});

test('chooses the days of the new period on the open calendar', async () => {
  const onChoose = jest.fn();
  const renderer = await render({ isOpen: true, onChoose });

  await act(() => day(renderer, '2026-08-10')[0].props.onPress());

  expect(onChoose).toHaveBeenCalledWith({ from: '2026-08-10', to: null });
});

test('applies only a complete period', async () => {
  const onApply = jest.fn();
  const renderer = await render({ isOpen: true, canApply: false, onApply });

  expect(pressableWithText(renderer, 'Aplicar').props.disabled).toBe(true);

  await act(() => {
    renderer.update(
      <HistoryPeriodField {...PROPS} isOpen canApply onApply={onApply} />,
    );
  });
  await act(() => pressableWithText(renderer, 'Aplicar').props.onPress());

  expect(onApply).toHaveBeenCalledTimes(1);
});

test('goes back to the current month from the calendar', async () => {
  const onShowCurrentMonth = jest.fn();
  const renderer = await render({ isOpen: true, onShowCurrentMonth });

  await act(() => pressableWithText(renderer, 'Mês atual').props.onPress());

  expect(onShowCurrentMonth).toHaveBeenCalledTimes(1);
});
