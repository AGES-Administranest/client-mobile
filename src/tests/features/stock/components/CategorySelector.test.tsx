import ReactTestRenderer, { act } from 'react-test-renderer';

import { CategorySelector } from 'features/stock/components/CategorySelector';

const labels = {
  medication: 'Medicamento',
  anesthetic: 'Anestésico',
  disposable: 'Descartável',
};

test('renders one chip per category, marks the selected one and reports taps', async () => {
  const onSelect = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <CategorySelector
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
