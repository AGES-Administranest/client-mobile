import { ChevronDown, ChevronUp } from 'lucide-react-native';
import ReactTestRenderer, {
  act,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import { ItemPicker } from 'app/components/ui/item-picker';

type ItemPickerProps = React.ComponentProps<typeof ItemPicker>;

const OPTIONS = [
  { id: 'item-1', name: 'Dipirona 500mg', caption: '10 ampolas' },
  { id: 'item-2', name: 'Propofol 10mg/ml', caption: '1 frasco' },
];

async function render(overrides: Partial<ItemPickerProps> = {}) {
  const props: ItemPickerProps = {
    label: 'Item',
    placeholder: 'Selecione o item',
    options: OPTIONS,
    selectedId: null,
    emptyMessage: 'Nenhum item com estoque para dar baixa.',
    onSelect: jest.fn(),
    ...overrides,
  };
  let renderer: Renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<ItemPicker {...props} />);
  });
  return { renderer: renderer!, props };
}

function trigger(renderer: Renderer) {
  return renderer.root.find(
    node =>
      node.props.accessibilityLabel === 'Item' &&
      typeof node.props.onPress === 'function',
  );
}

function texts(renderer: Renderer): string[] {
  return renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .filter(child => typeof child === 'string');
}

async function open(renderer: Renderer) {
  await act(async () => trigger(renderer).props.onPress());
}

test('shows the placeholder, or the chosen item, while closed', async () => {
  const { renderer } = await render();
  expect(texts(renderer)).toEqual(['Selecione o item']);
  expect(trigger(renderer).props.accessibilityState).toEqual({
    expanded: false,
  });

  const { renderer: chosen } = await render({ selectedId: 'item-2' });
  expect(texts(chosen)).toEqual(['Propofol 10mg/ml']);
});

test('opens a list joined to the field, with how much of each item is in stock', async () => {
  const { renderer } = await render();

  await open(renderer);

  expect(texts(renderer)).toEqual([
    'Selecione o item',
    'Dipirona 500mg',
    '10 ampolas',
    'Propofol 10mg/ml',
    '1 frasco',
  ]);
  expect(trigger(renderer).props.className).toContain('rounded-t-xl');
  expect(trigger(renderer).props.accessibilityState).toEqual({
    expanded: true,
  });
  expect(
    renderer.root.findAll(node => node.props.as === ChevronUp),
  ).not.toHaveLength(0);
});

test('picking an item hands back its id and closes the list', async () => {
  const { renderer, props } = await render();
  await open(renderer);

  await act(async () =>
    renderer.root.findByProps({ testID: 'item-option-item-2' }).props.onPress(),
  );

  expect(props.onSelect).toHaveBeenCalledWith('item-2');
  expect(texts(renderer)).toEqual(['Selecione o item']);
  expect(
    renderer.root.findAll(node => node.props.as === ChevronDown),
  ).not.toHaveLength(0);
});

test('marks the chosen item in the list', async () => {
  const { renderer } = await render({ selectedId: 'item-1' });
  await open(renderer);

  const row = (id: string) =>
    renderer.root.findByProps({ testID: `item-option-${id}` });
  expect(row('item-1').props.accessibilityState).toEqual({ selected: true });
  expect(row('item-2').props.accessibilityState).toEqual({ selected: false });
});

test('says there is nothing to pick when no item has stock', async () => {
  const { renderer } = await render({ options: [] });

  await open(renderer);

  expect(texts(renderer)).toContain('Nenhum item com estoque para dar baixa.');
});

test('a missing item turns the border red', async () => {
  const { renderer } = await render({ hasError: true });

  expect(trigger(renderer).props.className).toContain('border-alert-primary');
});
