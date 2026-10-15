import { Inbox } from 'lucide-react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  EmptyState,
  type EmptyStateProps,
} from 'app/components/ui/empty-state';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

async function render(props: EmptyStateProps) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<EmptyState {...props} />);
  });
  return renderer;
}

test('centers an icon over a muted message by default', async () => {
  const renderer = await render({ icon: Inbox, message: 'Nada por aqui' });

  const message = renderer.root.findByType(Text);
  expect(renderer.root.findAllByType(Icon)).toHaveLength(1);
  expect(message.props.children).toBe('Nada por aqui');
  expect(message.props.variant).toBe('muted');
  expect(message.props.className).toContain('text-center');
});

test('aligns a plain message to the start, with no icon, when asked', async () => {
  const renderer = await render({
    align: 'start',
    message: 'Preencha os campos para que os valores sejam calculados',
  });

  const message = renderer.root.findByType(Text);
  expect(renderer.root.findAllByType(Icon)).toHaveLength(0);
  expect(message.props.variant).toBe('default');
  expect(message.props.className).not.toContain('text-center');
  expect(message.props.className).toContain('text-label-primary');
});

test('can carry a title and a pill action for the first record', async () => {
  const onPress = jest.fn();
  const renderer = await render({
    icon: Inbox,
    title: 'Nenhum lançamento neste mês',
    message: 'Registre uma entrada ou saída para acompanhar o seu saldo.',
    action: { label: 'Novo lançamento', icon: Inbox, onPress },
  });

  const texts = renderer.root
    .findAllByType(Text)
    .map(node => node.props.children);
  expect(texts).toEqual([
    'Nenhum lançamento neste mês',
    'Registre uma entrada ou saída para acompanhar o seu saldo.',
    'Novo lançamento',
  ]);

  const button = renderer.root.find(
    node => node.props.role === 'button' && !!node.props.onPress,
  );
  await act(async () => button.props.onPress());

  expect(onPress).toHaveBeenCalledTimes(1);
});
