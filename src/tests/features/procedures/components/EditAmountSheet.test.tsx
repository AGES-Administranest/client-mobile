import { TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { EditAmountSheet } from 'features/procedures/components/EditAmountSheet';

const METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const TEXTS = {
  title: 'Valor do atendimento',
  placeholder: '0,00',
  confirm: 'Salvar',
  close: 'Fechar',
};

async function render(
  overrides: Partial<Parameters<typeof EditAmountSheet>[0]> = {},
) {
  const props = {
    visible: true,
    value: '350,00',
    errorText: null,
    submitting: false,
    texts: TEXTS,
    onChangeValue: jest.fn(),
    onConfirm: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <EditAmountSheet {...props} />
      </SafeAreaProvider>,
    );
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

function labeled(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.find(node => node.props?.accessibilityLabel === label);
}

test('mostra o título, o campo de valor e o botão de salvar', async () => {
  const { renderer } = await render();

  expect(texts(renderer)).toEqual([TEXTS.title, TEXTS.confirm]);
  const input = renderer.root.findByType(TextInput);
  expect(input.props.value).toBe('350,00');
  expect(input.props.keyboardType).toBe('decimal-pad');
  expect(input.props.placeholder).toBe(TEXTS.placeholder);
});

test('repassa o valor digitado e o salvar', async () => {
  const { renderer, props } = await render();

  await act(async () =>
    renderer.root.findByType(TextInput).props.onChangeText('400'),
  );
  await act(async () => labeled(renderer, TEXTS.confirm).props.onPress());

  expect(props.onChangeValue).toHaveBeenCalledWith('400');
  expect(props.onConfirm).toHaveBeenCalledTimes(1);
});

test('o fundo fecha a folha', async () => {
  const { renderer, props } = await render();

  await act(async () => labeled(renderer, TEXTS.close).props.onPress());

  expect(props.onClose).toHaveBeenCalledTimes(1);
});

test('mostra o erro do campo', async () => {
  const { renderer } = await render({ errorText: 'Informe o valor.' });

  expect(texts(renderer)).toContain('Informe o valor.');
});

test('enquanto salva, trava o botão e o campo', async () => {
  const { renderer } = await render({ submitting: true });

  expect(labeled(renderer, TEXTS.confirm).props.disabled).toBe(true);
  expect(renderer.root.findByType(TextInput).props.editable).toBe(false);
});
