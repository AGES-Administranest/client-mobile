import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AppointmentActions,
  type AppointmentActionsCancellation,
} from 'features/procedures/components/AppointmentActions';
import type { AppointmentActionNotice } from 'features/procedures/domain/toCompletionOutcome';

const TEXTS = {
  complete: 'Finalizar procedimento',
  cancel: 'Não realizado',
  toast: 'Agendamento marcado como não realizado',
  notices: {
    CANCELED: 'Este agendamento foi cancelado.',
    COMPLETED: 'Este agendamento já foi finalizado.',
    AMOUNT_REQUIRED: 'Preencha o valor do atendimento antes de finalizar.',
    FAILED: 'Não foi possível finalizar o procedimento.',
    CANCEL_FAILED: 'Não foi possível cancelar o agendamento.',
  },
  cancellation: {
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
    errors: {
      REQUIRED: 'Informe o motivo do cancelamento.',
      TOO_LONG: 'O motivo pode ter no máximo 2000 caracteres.',
      FAILED: 'Não foi possível cancelar o agendamento.',
    },
  },
};

function cancellation(
  overrides: Partial<AppointmentActionsCancellation> = {},
): AppointmentActionsCancellation {
  return {
    sheetVisible: false,
    preset: null,
    reason: '',
    reasonError: null,
    failed: false,
    open: jest.fn(),
    close: jest.fn(),
    setPreset: jest.fn(),
    setReason: jest.fn(),
    confirm: jest.fn(),
    ...overrides,
  };
}

async function render({
  visible = true,
  submitting = false,
  notice = null,
  justCanceled = false,
  onComplete = jest.fn(),
  cancel = cancellation(),
}: {
  visible?: boolean;
  submitting?: boolean;
  notice?: AppointmentActionNotice | null;
  justCanceled?: boolean;
  onComplete?: () => void;
  cancel?: AppointmentActionsCancellation;
} = {}) {
  let renderer: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AppointmentActions
        visible={visible}
        submitting={submitting}
        notice={notice}
        justCanceled={justCanceled}
        texts={TEXTS}
        onComplete={onComplete}
        cancellation={cancel}
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

// O Pressable interno do Button, onde as classes da variante se juntam.
function button(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.find(
    node =>
      node.props?.role === 'button' && node.props?.accessibilityLabel === label,
  );
}

function hasButton(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
): boolean {
  return (
    renderer.root.findAll(
      node =>
        node.props?.role === 'button' &&
        node.props?.accessibilityLabel === label,
    ).length > 0
  );
}

test('depois de marcar como não realizado, mostra o aviso no lugar dos botões', async () => {
  const renderer = await render({ visible: false, justCanceled: true });

  expect(texts(renderer)).toEqual([TEXTS.toast]);
  expect(hasButton(renderer, TEXTS.complete)).toBe(false);
});

test('não renderiza nada quando não está visível', async () => {
  const renderer = await render({ visible: false });

  expect(renderer.toJSON()).toBeNull();
});

test('Finalizar: pílula larga, marrom da paleta', async () => {
  const renderer = await render();

  const className = button(renderer, TEXTS.complete).props.className as string;
  // `bg-primary` resolve para --primary, o palette-button-primary (marrom).
  expect(className).toContain('bg-primary');
  expect(className).toContain('rounded-full');
  expect(className).toContain('w-full');
});

test('Não realizado: pílula larga, vermelha da paleta', async () => {
  const renderer = await render();

  const className = button(renderer, TEXTS.cancel).props.className as string;
  // `bg-secondary` resolve para --secondary, o palette-button-secondary
  // (#A33423), com texto branco.
  expect(className).toContain('bg-secondary');
  expect(className).toContain('rounded-full');
  expect(className).toContain('w-full');
});

test('tocar em Finalizar chama onComplete e em Não realizado abre a folha', async () => {
  const onComplete = jest.fn();
  const cancel = cancellation();
  const renderer = await render({ onComplete, cancel });

  await act(async () => button(renderer, TEXTS.complete).props.onPress());
  await act(async () => button(renderer, TEXTS.cancel).props.onPress());

  expect(onComplete).toHaveBeenCalledTimes(1);
  expect(cancel.open).toHaveBeenCalledTimes(1);
});

test('os dois botões ficam desabilitados enquanto uma ação está em andamento', async () => {
  const renderer = await render({ submitting: true });

  expect(button(renderer, TEXTS.complete).props.disabled).toBe(true);
  expect(button(renderer, TEXTS.cancel).props.disabled).toBe(true);
});

test.each(['AMOUNT_REQUIRED', 'FAILED', 'CANCEL_FAILED'] as const)(
  'o aviso %s aparece embaixo dos botões, que continuam disponíveis',
  async notice => {
    const renderer = await render({ notice });

    expect(texts(renderer)).toContain(TEXTS.notices[notice]);
    expect(button(renderer, TEXTS.complete).props.disabled).toBe(false);
  },
);

test.each(['CANCELED', 'COMPLETED'] as const)(
  'com o aviso %s, mostra só o texto no lugar dos botões',
  async notice => {
    const renderer = await render({ notice });

    expect(texts(renderer)).toEqual([TEXTS.notices[notice]]);
    expect(hasButton(renderer, TEXTS.complete)).toBe(false);
    expect(hasButton(renderer, TEXTS.cancel)).toBe(false);
  },
);

test.each([
  ['REQUIRED', { reasonError: 'REQUIRED' as const }],
  ['TOO_LONG', { reasonError: 'TOO_LONG' as const }],
  ['FAILED', { failed: true }],
] as const)('a folha mostra o erro %s traduzido', async (key, overrides) => {
  const renderer = await render({
    cancel: cancellation({ sheetVisible: true, ...overrides }),
  });

  expect(texts(renderer)).toContain(TEXTS.cancellation.errors[key]);
});
