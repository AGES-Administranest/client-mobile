import ReactTestRenderer, { act } from 'react-test-renderer';

import { ChipSelector } from 'features/stock/components/ChipSelector';
import { STOCK_CATEGORIES } from 'features/stock/domain/stockItem';

const labels = {
  medication: 'Medicamento',
  anesthetic: 'Anestésico',
  disposable: 'Descartável',
};

test('renders one chip per option, marks the selected one and reports taps', async () => {
  const onSelect = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <ChipSelector
        options={STOCK_CATEGORIES}
        value="anesthetic"
        labels={labels}
        onSelect={onSelect}
      />,
    );
  });

  const chips = renderer!.root.findAll(
    node =>
      node.props.accessibilityRole === 'radio' &&
      typeof node.props.onPress === 'function',
  );

  expect(chips).toHaveLength(3);
  expect(chips.map(chip => chip.props.accessibilityState.selected)).toEqual([
    false,
    true,
    false,
  ]);

  await act(() => {
    chips[2].props.onPress();
  });

  expect(onSelect).toHaveBeenCalledWith('disposable');
});
