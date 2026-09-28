import ReactTestRenderer, { act } from 'react-test-renderer';

import { AppointmentActions } from './AppointmentActions';
import type { AppointmentActionNotice } from '../domain/toCompletionOutcome';

const TEXTS = {
  complete: 'Finalizar procedimento',
  notices: {
    CANCELED: 'Este agendamento foi cancelado.',
    AMOUNT_REQUIRED: 'Preencha o valor do atendimento antes de finalizar.',
    FAILED: 'Não foi possível finalizar o procedimento.',
  },
};

async function render({
  visible = true,
  submitting = false,
  notice = null,
  onComplete = jest.fn(),
}: {
  visible?: boolean;
  submitting?: boolean;
  notice?: AppointmentActionNotice | null;
  onComplete?: () => void;
} = {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AppointmentActions
        visible={visible}
        submitting={submitting}
        notice={notice}
        texts={TEXTS}
        onComplete={onComplete}
      />,
    );
  });
  return renderer!;
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

function completeButton(renderer: ReactTestRenderer.ReactTestRenderer) {
  // O Pressable interno do Button, onde as classes da variante se juntam.
  return renderer.root.find(
    node =>
      node.props?.role === 'button' &&
      node.props?.accessibilityLabel === TEXTS.complete,
  );
}

test('não renderiza nada quando não está visível', async () => {
  const renderer = await render({ visible: false });

  expect(renderer.toJSON()).toBeNull();
});

test('o botão é largo, em pílula, marrom da paleta e com o texto da ação', async () => {
  const renderer = await render();

  const className = completeButton(renderer).props.className as string;
  // `bg-primary` resolve para --primary, o palette-button-primary (marrom).
  expect(className).toContain('bg-primary');
  expect(className).toContain('rounded-full');
  expect(className).toContain('w-full');
  expect(texts(renderer)).toContain('Finalizar procedimento');
});

test('tocar no botão chama onComplete', async () => {
  const onComplete = jest.fn();
  const renderer = await render({ onComplete });

  await act(async () => completeButton(renderer).props.onPress());

  expect(onComplete).toHaveBeenCalledTimes(1);
});

test('fica desabilitado enquanto a requisição está em andamento', async () => {
  const renderer = await render({ submitting: true });

  expect(completeButton(renderer).props.disabled).toBe(true);
});

test.each(['AMOUNT_REQUIRED', 'FAILED'] as const)(
  'o aviso %s aparece embaixo do botão, que continua disponível',
  async notice => {
    const renderer = await render({ notice });

    expect(texts(renderer)).toContain(TEXTS.notices[notice]);
    expect(completeButton(renderer).props.disabled).toBe(false);
  },
);

test('com o aviso de cancelado, mostra só o texto no lugar do botão', async () => {
  const renderer = await render({ notice: 'CANCELED' });

  expect(texts(renderer)).toEqual([TEXTS.notices.CANCELED]);
  expect(
    renderer.root.findAll(
      node => node.props?.accessibilityLabel === TEXTS.complete,
    ),
  ).toHaveLength(0);
});
