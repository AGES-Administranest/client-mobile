import ReactTestRenderer, { act } from 'react-test-renderer';

import { DateRangePicker } from 'app/components/ui/date-range-picker';
import type { CalendarRange } from 'shared/utils/calendar';

const EMPTY: CalendarRange = { from: null, to: null };

async function render(value: CalendarRange, onChange = jest.fn()) {
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <DateRangePicker
        value={value}
        onChange={onChange}
        locale="pt-BR"
        previousMonthLabel="Mês anterior"
        nextMonthLabel="Próximo mês"
      />,
    );
  });

  return { renderer: renderer!, onChange };
}

function dayCell(renderer: ReactTestRenderer.ReactTestRenderer, date: string) {
  return renderer.root.find(
    node =>
      node.props.testID === date && typeof node.props.onPress === 'function',
  );
}

function pressLabelled(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  return renderer.root.find(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  );
}

function textsOf(renderer: ReactTestRenderer.ReactTestRenderer) {
  return JSON.stringify(
    renderer.root
      .findAllByType('Text' as never)
      .map(node => node.props.children),
  );
}

test('opens on the month of the selected start date', async () => {
  const { renderer } = await render({ from: '2026-09-08', to: null });

  expect(textsOf(renderer)).toContain('setembro de 2026');
});

test('reports the picked day as the start of a new range', async () => {
  const { renderer, onChange } = await render(EMPTY);

  await act(() => {
    dayCell(renderer, '2026-09-08').props.onPress();
  });

  expect(onChange).toHaveBeenCalledWith({ from: '2026-09-08', to: null });
});

test('selects a single day when the same day is picked as start and end', async () => {
  const { renderer, onChange } = await render({
    from: '2026-09-08',
    to: null,
  });

  await act(() => {
    dayCell(renderer, '2026-09-08').props.onPress();
  });

  expect(onChange).toHaveBeenCalledWith({
    from: '2026-09-08',
    to: '2026-09-08',
  });
});

test('marks every day of the selected range as selected', async () => {
  const { renderer } = await render({ from: '2026-09-08', to: '2026-09-10' });

  expect(dayCell(renderer, '2026-09-08').props.accessibilityState).toEqual({
    selected: true,
  });
  expect(dayCell(renderer, '2026-09-09').props.accessibilityState).toEqual({
    selected: true,
  });
  expect(dayCell(renderer, '2026-09-10').props.accessibilityState).toEqual({
    selected: true,
  });
  expect(dayCell(renderer, '2026-09-11').props.accessibilityState).toEqual({
    selected: false,
  });
});

test('navigates between months', async () => {
  const { renderer } = await render({ from: '2026-09-08', to: null });

  await act(() => {
    pressLabelled(renderer, 'Próximo mês').props.onPress();
  });

  expect(textsOf(renderer)).toContain('outubro de 2026');

  await act(() => {
    pressLabelled(renderer, 'Mês anterior').props.onPress();
    pressLabelled(renderer, 'Mês anterior').props.onPress();
  });

  expect(textsOf(renderer)).toContain('agosto de 2026');
});

test('announces each day with its full date, not just the number', async () => {
  const { renderer } = await render({ from: '2026-09-08', to: null });

  expect(dayCell(renderer, '2026-09-08').props.accessibilityLabel).toBe(
    '8 de setembro de 2026',
  );
});
