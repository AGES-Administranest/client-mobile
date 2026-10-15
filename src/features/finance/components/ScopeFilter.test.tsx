import ReactTestRenderer, { act } from 'react-test-renderer';

import { ScopeFilter } from './ScopeFilter';

const OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'PROFESSIONAL', label: 'Profissional' },
  { value: 'PERSONAL', label: 'Pessoal' },
] as const;

async function render(value: string, onChange = jest.fn()) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ScopeFilter
        options={OPTIONS}
        value={value}
        onChange={onChange}
        accessibilityLabel="Filtrar lançamentos por escopo"
      />,
    );
  });
  return renderer;
}

// O Pressable aparece duas vezes na árvore (o componente e o View nativo):
// o nativo não tem onPress.
const chips = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root.findAll(
    node =>
      node.props.accessibilityRole === 'radio' &&
      typeof node.props.onPress === 'function' &&
      typeof node.type !== 'string',
  );

test('shows one chip per option and marks the chosen one', async () => {
  const renderer = await render('PROFESSIONAL');

  const states = chips(renderer).map(chip => chip.props.accessibilityState);
  expect(states).toEqual([
    { checked: false, selected: false },
    { checked: true, selected: true },
    { checked: false, selected: false },
  ]);
});

test('reports the tapped option and leaves the choice to the owner', async () => {
  const onChange = jest.fn();
  const renderer = await render('all', onChange);

  await act(async () => chips(renderer)[2].props.onPress());

  expect(onChange).toHaveBeenCalledWith('PERSONAL');
  expect(chips(renderer)[0].props.accessibilityState.selected).toBe(true);
});
