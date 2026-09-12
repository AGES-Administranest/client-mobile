import ReactTestRenderer, { act } from 'react-test-renderer';

import { ConfirmSheet } from 'app/components/ui/confirm-sheet';

async function renderSheet(onConfirm = () => {}, onCancel = () => {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ConfirmSheet
        visible
        title="Excluir item"
        message='Tem certeza que deseja excluir "Dipirona"?'
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
  });
  return renderer!;
}

function classNames(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAll(node => typeof node.props?.className === 'string')
    .map(node => node.props.className as string);
}

test('the message is black, not muted grey', async () => {
  const renderer = await renderSheet();

  const message = classNames(renderer).find(name =>
    name.includes('text-[15px]'),
  );

  expect(message).toContain('text-label-primary');
  expect(message).not.toContain('text-label-tertiary');
});

test('the confirm button uses the brown from the palette', async () => {
  const renderer = await renderSheet();

  // `bg-primary` resolves to --primary, documented in global.css as
  // palette-button-primary (the brown). `bg-secondary` is the red one.
  const buttons = classNames(renderer).filter(name =>
    name.includes('rounded-full'),
  );

  expect(buttons.some(name => name.includes('bg-primary'))).toBe(true);
  expect(buttons.every(name => !name.includes('bg-secondary'))).toBe(true);
});

test('confirming and cancelling call the right handler', async () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();
  const renderer = await renderSheet(onConfirm, onCancel);

  const pressables = renderer.root.findAll(
    node => typeof node.props?.onPress === 'function',
  );
  const byLabel = (label: string) =>
    pressables
      .filter(node =>
        JSON.stringify(
          node.findAllByType('Text' as never).map(t => t.props.children),
        ).includes(label),
      )
      .pop()!;

  await act(async () => {
    byLabel('Excluir').props.onPress();
  });
  expect(onConfirm).toHaveBeenCalledTimes(1);

  await act(async () => {
    byLabel('Cancelar').props.onPress();
  });
  expect(onCancel).toHaveBeenCalledTimes(1);
});
