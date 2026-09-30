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

function buttonClass(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
): string {
  return renderer.root.find(
    node =>
      node.props?.role === 'button' &&
      typeof node.props?.className === 'string' &&
      node.findAll(
        child =>
          typeof child.type === 'string' && child.props?.children === label,
      ).length > 0,
  ).props.className as string;
}

test('confirm is the palette brown and cancel the palette red', async () => {
  const renderer = await renderSheet();

  // `bg-primary` resolves to --primary (palette-button-primary, the brown);
  // `bg-secondary` to --secondary (palette-button-secondary, the red).
  expect(buttonClass(renderer, 'Excluir')).toContain('bg-primary');
  expect(buttonClass(renderer, 'Cancelar')).toContain('bg-secondary');
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

test('without a cancel label only the confirm button shows, and tapping outside still cancels', async () => {
  const onCancel = jest.fn();
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ConfirmSheet
        visible
        title="Aviso"
        confirmLabel="Entendi"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
  });

  const texts = renderer!.root
    .findAllByType('Text' as never)
    .map(node => node.props.children);
  expect(texts).toContain('Entendi');
  expect(texts).not.toContain('Cancelar');

  const backdrop = renderer!.root.find(
    node =>
      typeof node.props?.onPress === 'function' &&
      typeof node.props?.className === 'string' &&
      node.props.className.includes('bg-background-shade'),
  );
  await act(async () => backdrop.props.onPress());
  expect(onCancel).toHaveBeenCalledTimes(1);
});
