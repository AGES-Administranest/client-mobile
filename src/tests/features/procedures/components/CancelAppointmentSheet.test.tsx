import { TextInput } from 'react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { CancelAppointmentSheet } from 'features/procedures/components/CancelAppointmentSheet';

const TEXTS = {
  title: 'Não realizado',
  reason: 'Por que o procedimento não foi realizado?',
  reasons: {
    noShow: 'Paciente não compareceu',
    clientCanceled: 'Cancelamento do cliente',
    emergency: 'Emergência',
    other: 'Outro',
  },
  reasonPlaceholder: 'Descreva o motivo',
  confirm: 'Confirmar',
  dismiss: 'Voltar',
};

async function render(
  overrides: Partial<Parameters<typeof CancelAppointmentSheet>[0]> = {},
) {
  const props = {
    visible: true,
    preset: null,
    reason: '',
    errorText: null,
    submitting: false,
    texts: TEXTS,
    onSelectPreset: jest.fn(),
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

function labeledButton(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
) {
  return renderer.root.find(node => node.props?.accessibilityLabel === label);
}

test('mostra título, pergunta, chips e os dois botões da folha', async () => {
  const { renderer } = await render();

  expect(texts(renderer)).toEqual([
    TEXTS.title,
    TEXTS.reason,
    TEXTS.reasons.noShow,
    TEXTS.reasons.clientCanceled,
    TEXTS.reasons.emergency,
    TEXTS.reasons.other,
    TEXTS.confirm,
    TEXTS.dismiss,
  ]);
  expect(renderer.root.findAllByType(TextInput)).toHaveLength(0);
});

test('Outro abre o campo livre; os outros chips não', async () => {
  const withOther = await render({ preset: 'other' });
  expect(withOther.renderer.root.findAllByType(TextInput)).toHaveLength(1);

  const withChip = await render({ preset: 'noShow' });
  expect(withChip.renderer.root.findAllByType(TextInput)).toHaveLength(0);
});

test('o campo livre é de várias linhas e para no limite do backend', async () => {
  const { renderer } = await render({ preset: 'other' });

  const input = renderer.root.findByType(TextInput);
  expect(input.props.multiline).toBe(true);
  expect(input.props.maxLength).toBe(2000);
  expect(input.props.placeholder).toBe(TEXTS.reasonPlaceholder);
  expect(input.props.accessibilityLabel).toBe(TEXTS.reason);
});

test('escolher um chip e confirmar chama os handlers', async () => {
  const { renderer, props } = await render();

  await act(async () =>
    labeledButton(renderer, TEXTS.reasons.emergency).props.onPress(),
  );
  await act(async () => labeledButton(renderer, TEXTS.confirm).props.onPress());

  expect(props.onSelectPreset).toHaveBeenCalledWith('emergency');
  expect(props.onConfirm).toHaveBeenCalledTimes(1);
});

test('digitar no Outro repassa o texto', async () => {
  const { renderer, props } = await render({
    preset: 'other',
    reason: 'Chuva',
  });

  await act(async () =>
    renderer.root.findByType(TextInput).props.onChangeText('Chuva forte'),
  );

  expect(props.onChangeReason).toHaveBeenCalledWith('Chuva forte');
});

test('Voltar e o fundo fecham a folha', async () => {
  const { renderer, props } = await render();

  await act(async () => labeledButton(renderer, TEXTS.dismiss).props.onPress());
  const backdrop = renderer.root.find(
    node =>
      typeof node.props?.className === 'string' &&
      node.props.className.includes('bg-background-shade') &&
      typeof node.props?.onPress === 'function',
  );
  await act(async () => backdrop.props.onPress());

  expect(props.onClose).toHaveBeenCalledTimes(2);
});

test('mostra o erro do campo', async () => {
  const { renderer } = await render({
    errorText: 'Informe o motivo do cancelamento.',
  });

  expect(texts(renderer)).toContain('Informe o motivo do cancelamento.');
});

test('enquanto envia, trava os botões e o campo', async () => {
  const { renderer } = await render({ submitting: true, preset: 'other' });

  expect(labeledButton(renderer, TEXTS.confirm).props.disabled).toBe(true);
  expect(labeledButton(renderer, TEXTS.dismiss).props.disabled).toBe(true);
  expect(renderer.root.findByType(TextInput).props.editable).toBe(false);
});
