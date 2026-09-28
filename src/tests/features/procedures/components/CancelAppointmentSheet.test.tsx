import { TextInput } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { CancelAppointmentSheet } from 'features/procedures/components/CancelAppointmentSheet';

const TEXTS = {
  title: 'Motivo do cancelamento',
  reasonPlaceholder: 'Escreva brevemente o motivo do cancelamento',
  confirm: 'Confirmar',
};

async function render(
  overrides: Partial<Parameters<typeof CancelAppointmentSheet>[0]> = {},
) {
  const props = {
    visible: true,
    reason: '',
    errorText: null,
    submitting: false,
    texts: TEXTS,
    onChangeReason: jest.fn(),
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<CancelAppointmentSheet {...props} />);
  });
  return { renderer: renderer!, props };
}

function texts(renderer: ReactTestRenderer.ReactTestRenderer): string[] {
  return renderer.root
    .findAll(
      node =>
        typeof node.type === 'string' &&
        typeof node.props?.children === 'string',
    )
    .map(node => node.props.children as string);
}

function confirmButton(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.find(
    node =>
      node.props?.role === 'button' &&
      node.props?.accessibilityLabel === TEXTS.confirm,
  );
}

test('mostra só o título e o botão Confirmar, sem rótulo repetindo o título no campo', async () => {
  const { renderer } = await render();

  expect(texts(renderer)).toEqual([TEXTS.title, TEXTS.confirm]);
  const buttonLabels = new Set(
    renderer.root
      .findAll(node => node.props?.role === 'button')
      .map(node => node.props.accessibilityLabel as string),
  );
  expect([...buttonLabels]).toEqual([TEXTS.confirm]);
});

test('o campo é de várias linhas e para no limite do backend', async () => {
  const { renderer } = await render();

  const input = renderer.root.findByType(TextInput);
  expect(input.props.multiline).toBe(true);
  expect(input.props.maxLength).toBe(2000);
  expect(input.props.placeholder).toBe(TEXTS.reasonPlaceholder);
  // Sem rótulo visível, o nome do campo para leitores de tela é o título.
  expect(input.props.accessibilityLabel).toBe(TEXTS.title);
});

test('digitar repassa o texto e confirmar chama onConfirm', async () => {
  const { renderer, props } = await render({ reason: 'Chuva' });

  await act(async () =>
    renderer.root.findByType(TextInput).props.onChangeText('Chuva forte'),
  );
  await act(async () => confirmButton(renderer).props.onPress());

  expect(props.onChangeReason).toHaveBeenCalledWith('Chuva forte');
  expect(props.onConfirm).toHaveBeenCalledTimes(1);
});

test('tocar fora da folha fecha', async () => {
  const { renderer, props } = await render();

  const backdrop = renderer.root.find(
    node =>
      typeof node.props?.className === 'string' &&
      node.props.className.includes('bg-background-shade') &&
      typeof node.props?.onPress === 'function',
  );
  await act(async () => backdrop.props.onPress());

  expect(props.onClose).toHaveBeenCalledTimes(1);
});

test('mostra o erro do campo', async () => {
  const { renderer } = await render({
    errorText: 'Informe o motivo do cancelamento.',
  });

  expect(texts(renderer)).toContain('Informe o motivo do cancelamento.');
});

test('enquanto envia, trava o botão e o campo', async () => {
  const { renderer } = await render({ submitting: true });

  expect(confirmButton(renderer).props.disabled).toBe(true);
  expect(renderer.root.findByType(TextInput).props.editable).toBe(false);
});
