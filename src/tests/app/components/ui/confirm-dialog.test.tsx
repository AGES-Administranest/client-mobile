import { CircleAlert, Trash2 } from 'lucide-react-native';
import { Text } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  ConfirmDialog,
  type ConfirmDialogProps,
} from 'app/components/ui/confirm-dialog';

type Renderer = ReactTestRenderer.ReactTestRenderer;

async function render(overrides: Partial<ConfirmDialogProps> = {}) {
  const props: ConfirmDialogProps = {
    visible: true,
    title: 'Excluir este lançamento?',
    message: 'Ele sai do extrato e essa ação não pode ser desfeita.',
    confirmLabel: 'Excluir',
    cancelLabel: 'Cancelar',
    icon: Trash2,
    confirmIcon: Trash2,
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };
  let renderer!: Renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<ConfirmDialog {...props} />);
  });
  return { renderer, props };
}

const textsOf = (renderer: Renderer) =>
  renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .filter(child => typeof child === 'string');

// O fundo e o cartão também respondem ao toque e contêm o texto: o botão é o
// elemento mais interno que tem o rótulo.
const button = (renderer: Renderer, label: string) => {
  const matches = renderer.root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      typeof node.type !== 'string' &&
      node.findAllByType('Text' as never).some(t => t.props.children === label),
  );
  return matches[matches.length - 1];
};

const backdrop = (renderer: Renderer) =>
  renderer.root.find(
    node =>
      typeof node.props?.onPress === 'function' &&
      typeof node.props?.className === 'string' &&
      node.props.className.includes('bg-background-shade'),
  );

test('sits in the middle of the screen, with the title, the message and the buttons in order', async () => {
  const { renderer } = await render();

  expect(backdrop(renderer).props.className).toEqual(
    expect.stringContaining('items-center justify-center'),
  );
  expect(textsOf(renderer)).toEqual([
    'Excluir este lançamento?',
    'Ele sai do extrato e essa ação não pode ser desfeita.',
    'Excluir',
    'Cancelar',
  ]);
});

test('the title is the header and the dialog keeps the screen reader inside', async () => {
  const { renderer } = await render();

  expect(
    renderer.root.find(
      node =>
        node.props.accessibilityRole === 'header' &&
        node.props.children === 'Excluir este lançamento?',
    ),
  ).toBeDefined();
  expect(
    renderer.root.findAll(node => node.props.accessibilityViewIsModal === true),
  ).not.toHaveLength(0);
});

test.each([
  ['danger', 'text-button-secondary'],
  ['neutral', 'text-label-quartenery'],
] as const)('a %s icon is painted %s', async (tone, color) => {
  const { renderer } = await render({ icon: CircleAlert, tone });

  const icon = renderer.root.find(
    node => node.props.as === CircleAlert && node.props.size === 26,
  );
  expect(icon.props.className).toBe(color);
});

test('confirming, cancelling and tapping outside call the right handler', async () => {
  const { renderer, props } = await render();

  await act(async () => button(renderer, 'Excluir').props.onPress());
  await act(async () => button(renderer, 'Cancelar').props.onPress());
  await act(async () => backdrop(renderer).props.onPress());

  expect(props.onConfirm).toHaveBeenCalledTimes(1);
  expect(props.onCancel).toHaveBeenCalledTimes(2);
});

test('a tap on the card itself does not cancel', async () => {
  const { renderer, props } = await render();
  const card = renderer.root.find(node => node.props.role === 'alertdialog');

  await act(async () =>
    card.props.onPress({ stopPropagation: () => undefined }),
  );

  expect(props.onCancel).not.toHaveBeenCalled();
});

test('without a cancel label only the confirm button shows', async () => {
  const { renderer } = await render({
    cancelLabel: undefined,
    confirmLabel: 'Fechar',
  });

  expect(textsOf(renderer)).toContain('Fechar');
  expect(textsOf(renderer)).not.toContain('Cancelar');
});

test('shows extra content between the message and the buttons', async () => {
  const { renderer } = await render({
    children: <Text>O lançamento dele sai do extrato.</Text>,
  });

  expect(textsOf(renderer)).toEqual([
    'Excluir este lançamento?',
    'Ele sai do extrato e essa ação não pode ser desfeita.',
    'O lançamento dele sai do extrato.',
    'Excluir',
    'Cancelar',
  ]);
});

test('calls onClosed once it finished closing, and not while it is open', async () => {
  const onClosed = jest.fn();
  const dialog = (visible: boolean) => (
    <ConfirmDialog
      visible={visible}
      title="Aviso"
      confirmLabel="Fechar"
      onConfirm={() => {}}
      onCancel={() => {}}
      onClosed={onClosed}
    />
  );
  let renderer!: Renderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(dialog(true));
  });
  expect(onClosed).not.toHaveBeenCalled();

  await act(async () => renderer.update(dialog(false)));

  expect(onClosed).toHaveBeenCalledTimes(1);
});

test('does not call onClosed when it never opened', async () => {
  const onClosed = jest.fn();
  await act(async () => {
    ReactTestRenderer.create(
      <ConfirmDialog
        visible={false}
        title="Aviso"
        confirmLabel="Fechar"
        onConfirm={() => {}}
        onCancel={() => {}}
        onClosed={onClosed}
      />,
    );
  });

  expect(onClosed).not.toHaveBeenCalled();
});
