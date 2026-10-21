import type { ComponentProps } from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { PeriodBalanceCard } from './PeriodBalanceCard';

const LABELS = {
  monthLabel: 'Agosto 2026',
  netBalanceLabel: 'Saldo líquido',
  netBalance: 'R$ 620',
  previousMonthLabel: 'Mês anterior',
  nextMonthLabel: 'Próximo mês',
};

async function render(
  overrides: Partial<ComponentProps<typeof PeriodBalanceCard>> = {},
) {
  const props = {
    ...LABELS,
    currentMonthLabel: 'Mês atual' as string | null,
    isNegative: false,
    onPreviousMonth: jest.fn(),
    onNextMonth: jest.fn(),
    ...overrides,
  };
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<PeriodBalanceCard {...props} />);
  });
  return { renderer, props };
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children);
}

function button(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.find(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function' &&
      typeof node.type !== 'string',
  );
}

test('shows the current month caption only for the month on screen', async () => {
  const current = await render();
  expect(textsOf(current.renderer)).toContain('Mês atual');

  const other = await render({ currentMonthLabel: null });
  expect(textsOf(other.renderer)).not.toContain('Mês atual');
  expect(textsOf(other.renderer)).toContain('Agosto 2026');
});

test('the next month stays available and both arrows move the period', async () => {
  const { renderer, props } = await render();
  const next = button(renderer, 'Próximo mês');

  expect(next.props.disabled).toBeFalsy();
  expect(next.props.accessibilityState?.disabled).not.toBe(true);

  await act(async () => next.props.onPress());
  await act(async () => button(renderer, 'Mês anterior').props.onPress());

  expect(props.onNextMonth).toHaveBeenCalledTimes(1);
  expect(props.onPreviousMonth).toHaveBeenCalledTimes(1);
});

test('a negative balance uses the alert color', async () => {
  const { renderer } = await render({
    netBalance: '–R$ 80',
    isNegative: true,
  });
  const balance = renderer.root
    .findAllByType('Text' as never)
    .find(node => node.props.children === '–R$ 80');

  expect(balance?.props.className).toContain('text-alert-primary');
});

test('a positive balance stays in the default color', async () => {
  const { renderer } = await render();
  const balance = renderer.root
    .findAllByType('Text' as never)
    .find(node => node.props.children === 'R$ 620');

  expect(balance?.props.className).toContain('text-label-primary');
  expect(balance?.props.className).not.toContain('text-alert-primary');
});
