import ReactTestRenderer, { act } from 'react-test-renderer';

import { CategoryFilter } from 'app/components/ui/CategoryFilter';

test('renders every option, marking the active one selected', async () => {
  const onValueChange = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <CategoryFilter
        options={[
          { value: 'all', label: 'Todos' },
          { value: 'Medicamento', label: 'Medicamento' },
          { value: 'Anestésico', label: 'Anestésico' },
          { value: 'Descartavel', label: 'Descartavel' },
        ]}
        value="all"
        onValueChange={onValueChange}
      />,
    );
  });

  const options = renderer!.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function',
  );

  expect(options).toHaveLength(4);
  expect(options[0].props.accessibilityState).toEqual({ selected: true });
  expect(options[1].props.accessibilityState).toEqual({ selected: false });

  const texts = renderer!.root
    .findAllByType('Text' as never)
    .map(node => node.props.children);
  expect(texts).toEqual(['Todos', 'Medicamento', 'Anestésico', 'Descartavel']);
});

test('calls onValueChange with the tapped option value', async () => {
  const onValueChange = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <CategoryFilter
        options={[
          { value: 'all', label: 'Todos' },
          { value: 'Medicamento', label: 'Medicamento' },
          { value: 'Anestésico', label: 'Anestésico' },
        ]}
        value="all"
        onValueChange={onValueChange}
      />,
    );
  });

  const options = renderer!.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function',
  );

  await act(() => {
    options[1].props.onPress();
  });

  expect(onValueChange).toHaveBeenCalledWith('Medicamento');
});
