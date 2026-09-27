import ReactTestRenderer, { act } from 'react-test-renderer';

import { NewClientSheet, type NewClientSheetProps } from './NewClientSheet';
import { EMPTY_NEW_CLIENT_DRAFT } from '../domain/newClientForm';

function props(overrides: Partial<NewClientSheetProps> = {}) {
  return {
    visible: true,
    draft: EMPTY_NEW_CLIENT_DRAFT,
    fieldErrors: {},
    failureMessage: null,
    isSaving: false,
    title: 'Novo tomador',
    typeLabel: 'Tipo',
    typeTexts: { CLINIC: 'Clínica', INDIVIDUAL: 'Pessoa física' },
    fieldTexts: {
      name: { label: 'Nome', placeholder: 'Nome do tomador' },
      phone: { label: 'Telefone (opcional)', placeholder: 'DDD + número' },
    },
    confirmLabel: 'Cadastrar',
    savingLabel: 'Salvando…',
    cancelLabel: 'Cancelar',
    closeLabel: 'Fechar',
    onChangeField: jest.fn(),
    onChangeType: jest.fn(),
    onSubmit: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  } satisfies NewClientSheetProps;
}

async function render(p: NewClientSheetProps) {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(<NewClientSheet {...p} />);
  });
  return renderer;
}

function pressableWithText(
  renderer: ReactTestRenderer.ReactTestRenderer,
  text: string,
) {
  const label = renderer.root.findAll(node => node.props.children === text)[0];
  let node = label;
  while (node && typeof node.props.onPress !== 'function') {
    node = node.parent as typeof label;
  }
  return node;
}

test('há um "Cancelar" visível que fecha sem cadastrar', async () => {
  const p = props();
  const renderer = await render(p);

  await act(async () =>
    pressableWithText(renderer, 'Cancelar').props.onPress(),
  );

  expect(p.onClose).toHaveBeenCalledTimes(1);
  expect(p.onSubmit).not.toHaveBeenCalled();
});

test('tocar no fundo escurecido também fecha', async () => {
  const p = props();
  const renderer = await render(p);

  const backdrop = renderer.root.findByProps({ accessibilityLabel: 'Fechar' });
  await act(async () => backdrop.props.onPress());

  expect(p.onClose).toHaveBeenCalledTimes(1);
});

test('o botão de cadastrar não chama onClose', async () => {
  const p = props();
  const renderer = await render(p);

  await act(async () =>
    pressableWithText(renderer, 'Cadastrar').props.onPress(),
  );

  expect(p.onSubmit).toHaveBeenCalledTimes(1);
  expect(p.onClose).not.toHaveBeenCalled();
});
