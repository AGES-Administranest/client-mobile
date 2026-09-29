import ReactTestRenderer, { act } from 'react-test-renderer';

import {
  AppointmentActions,
  type AppointmentActionsCancellation,
} from 'features/procedures/components/AppointmentActions';
import type { AppointmentActionNotice } from 'features/procedures/domain/toCompletionOutcome';

const TEXTS = {
  open: 'Atualizar status',
  complete: 'Finalizar procedimento',
  notDone: 'Não realizado',
  cancel: 'Cancelar atendimento',
  notDonePrefix: 'Não realizado',
  toast: {
    cancel: 'Atendimento cancelado',
    notDone: 'Agendamento marcado como não realizado',
  },
  notices: {
    CANCELED: 'Este agendamento foi cancelado.',
    COMPLETED: 'Este agendamento já foi finalizado.',
    AMOUNT_REQUIRED: 'Preencha o valor do atendimento antes de finalizar.',
    FAILED: 'Não foi possível finalizar o procedimento.',
    CANCEL_FAILED: 'Não foi possível cancelar o agendamento.',
  },
  cancellation: {
    byMode: {
      cancel: {
        title: 'Motivo do cancelamento',
        reason: 'Por que o atendimento foi cancelado?',
      },
      notDone: {
        title: 'Não realizado',
        reason: 'Por que o procedimento não foi realizado?',
      },
    },
    reasons: {
      noShow: 'Paciente não compareceu',
      clientCanceled: 'Cancelamento do cliente',
      emergency: 'Emergência',
      other: 'Outro',
    },
    reasonPlaceholder: 'Descreva o motivo',
    confirm: 'Confirmar',
    dismiss: 'Cancelar',
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
    mode: 'cancel',
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

// As opções da folha são Buttons sem accessibilityLabel: acha pelo texto.
function option(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.find(
    node =>
      node.props?.role === 'button' &&
      typeof node.props?.onPress === 'function' &&
      node.findAll(
        child =>
          typeof child.type === 'string' && child.props?.children === label,
      ).length > 0,
  );
}

test.each([
  ['cancel', 'Atendimento cancelado'],
  ['notDone', 'Agendamento marcado como não realizado'],
] as const)(
  'depois de %s, mostra o aviso daquele modo no lugar do botão',
  async (mode, toast) => {
    const renderer = await render({
      visible: false,
      justCanceled: true,
      cancel: cancellation({ mode }),
    });

    expect(texts(renderer)).toEqual([toast]);
    expect(hasButton(renderer, TEXTS.open)).toBe(false);
  },
);

test('não renderiza nada quando não está visível', async () => {
  const renderer = await render({ visible: false });

  expect(renderer.toJSON()).toBeNull();
});

test('um botão só, marrom, abre a folha com as três ações', async () => {
  const renderer = await render();

  const className = button(renderer, TEXTS.open).props.className as string;
  expect(className).toContain('bg-primary');
  expect(className).toContain('rounded-full');

  await act(async () => button(renderer, TEXTS.open).props.onPress());

  expect(texts(renderer)).toEqual(
    expect.arrayContaining([
      'Finalizar procedimento',
      'Não realizado',
      'Cancelar atendimento',
    ]),
  );
  // Cancelar é a única vermelha.
  expect(option(renderer, 'Cancelar atendimento').props.className).toContain(
    'bg-secondary',
  );
});

test.each([
  ['Finalizar procedimento', null],
  ['Não realizado', 'notDone'],
  ['Cancelar atendimento', 'cancel'],
] as const)('a opção %s dispara a ação certa', async (label, mode) => {
  const onComplete = jest.fn();
  const cancel = cancellation();
  const renderer = await render({ onComplete, cancel });

  await act(async () => button(renderer, TEXTS.open).props.onPress());
  await act(async () => option(renderer, label).props.onPress());

  if (mode === null) {
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(cancel.open).not.toHaveBeenCalled();
  } else {
    expect(cancel.open).toHaveBeenCalledWith(mode);
    expect(onComplete).not.toHaveBeenCalled();
  }
});

test('o botão fica desabilitado enquanto uma ação está em andamento', async () => {
  const renderer = await render({ submitting: true });

  expect(button(renderer, TEXTS.open).props.disabled).toBe(true);
});

test('a folha de motivo usa o título e a pergunta do modo', async () => {
  const renderer = await render({
    cancel: cancellation({ sheetVisible: true, mode: 'notDone' }),
  });

  expect(texts(renderer)).toEqual(
    expect.arrayContaining([
      'Não realizado',
      'Por que o procedimento não foi realizado?',
    ]),
  );
});

test.each(['AMOUNT_REQUIRED', 'FAILED', 'CANCEL_FAILED'] as const)(
  'o aviso %s aparece embaixo dos botões, que continuam disponíveis',
  async notice => {
    const renderer = await render({ notice });

    expect(texts(renderer)).toContain(TEXTS.notices[notice]);
    expect(button(renderer, TEXTS.open).props.disabled).toBe(false);
  },
);

test.each(['CANCELED', 'COMPLETED'] as const)(
  'com o aviso %s, mostra só o texto no lugar dos botões',
  async notice => {
    const renderer = await render({ notice });

    expect(texts(renderer)).toEqual([TEXTS.notices[notice]]);
    expect(hasButton(renderer, TEXTS.open)).toBe(false);
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
