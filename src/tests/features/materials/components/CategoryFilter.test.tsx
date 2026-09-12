import ReactTestRenderer, { act } from 'react-test-renderer';

import { CategoryFilter } from 'features/materials/components/CategoryFilter';
import { I18nProvider } from 'shared/i18n';

test('renders "Todos" plus every category, marking the active one selected', async () => {
  const onValueChange = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <CategoryFilter
          categories={['Medicamento', 'Anestésico', 'Descartavel']}
          value="all"
          onValueChange={onValueChange}
        />
      </I18nProvider>,
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

test('calls onValueChange with the tapped category', async () => {
  const onValueChange = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;

  await act(() => {
    renderer = ReactTestRenderer.create(
      <I18nProvider>
        <CategoryFilter
          categories={['Medicamento', 'Anestésico']}
          value="all"
          onValueChange={onValueChange}
        />
      </I18nProvider>,
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
