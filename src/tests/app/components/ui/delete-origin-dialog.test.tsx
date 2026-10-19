import { Trash2 } from 'lucide-react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { ConfirmDialog } from 'app/components/ui/confirm-dialog';
import { DeleteOriginDialog } from 'app/components/ui/delete-origin-dialog';

const EFFECTS = [
  'O lançamento dele sai do extrato de Finanças.',
  'Os materiais usados voltam para o estoque.',
  'O atendimento sai da agenda e do histórico.',
];

async function render(effects: readonly string[] = EFFECTS) {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <DeleteOriginDialog
        visible
        title="Excluir este atendimento?"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        effectsLabel="Ao excluir:"
        effects={effects}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
  });
  return { renderer: renderer!, onConfirm, onCancel };
}

const textsOf = (renderer: ReactTestRenderer.ReactTestRenderer) =>
  renderer.root
    .findAllByType('Text' as never)
    .map(node => node.props.children)
    .filter(child => typeof child === 'string');

test('lists what goes along, under the question, before the buttons', async () => {
  const { renderer } = await render();

  expect(textsOf(renderer)).toEqual([
    'Excluir este atendimento?',
    'Ao excluir:',
    '•',
    EFFECTS[0],
    '•',
    EFFECTS[1],
    '•',
    EFFECTS[2],
    'Excluir',
    'Cancelar',
  ]);
});

test('reads the list as one sentence to a screen reader', async () => {
  const { renderer } = await render();

  const list = renderer.root.find(
    node =>
      node.props.accessible === true &&
      typeof node.props.accessibilityLabel === 'string' &&
      node.props.accessibilityLabel.startsWith('Ao excluir:'),
  );
  expect(list.props.accessibilityLabel).toBe(
    ['Ao excluir:', ...EFFECTS].join(' '),
  );
});

test('a delete is a red trash dialog in the middle of the screen', async () => {
  const { renderer } = await render();

  const dialog = renderer.root.findByType(ConfirmDialog);
  expect(dialog.props).toMatchObject({
    icon: Trash2,
    tone: 'danger',
    confirmIcon: Trash2,
  });
});

test('with nothing else to lose it is the plain confirmation', async () => {
  const { renderer } = await render([]);

  expect(textsOf(renderer)).toEqual([
    'Excluir este atendimento?',
    'Excluir',
    'Cancelar',
  ]);
});
