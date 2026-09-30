import ReactTestRenderer, { act } from 'react-test-renderer';

import { AuthProvider, TERMS_VERSION, type Account } from 'features/auth';
import {
  useAppointmentActions,
  type ActionableAppointment,
} from 'features/procedures/hooks/useAppointmentActions';
import {
  cancelAppointment,
  completeAppointment,
} from 'features/procedures/services/procedureService';
import { ApiError } from 'shared/services/apiClient';

jest.mock('features/procedures/services/procedureService', () => ({
  completeAppointment: jest.fn(),
  cancelAppointment: jest.fn(),
}));
// A sessão entra pronta pelo AuthProvider; nada de auth pode ir à rede.
jest.mock('features/auth/services/authService', () => ({}));
jest.mock('features/auth/services/socialAuthService', () => ({}));
jest.mock('features/auth/services/accountApi', () => ({}));

const completeMock = completeAppointment as jest.MockedFunction<
  typeof completeAppointment
>;
const cancelMock = cancelAppointment as jest.MockedFunction<
  typeof cancelAppointment
>;

const SESSION = {
  idToken: 'id-token',
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: 1,
};

const ACCOUNT: Account = {
  id: 'user-1',
  name: 'Bruna Senha',
  email: 'bruna@example.com',
  termsAcceptedAt: '2026-09-13T12:00:00.000Z',
  termsVersion: TERMS_VERSION,
};

const SCHEDULED: ActionableAppointment = {
  id: 'appointment-1',
  status: 'SCHEDULED',
};

function apiError(
  status: number,
  code: string | null,
  details: Record<string, unknown> | null = null,
) {
  return new ApiError('erro', code, status, details);
}

async function mountHook(
  appointment: ActionableAppointment = SCHEDULED,
  onChanged: () => void = jest.fn(),
  session: typeof SESSION | null = SESSION,
) {
  const result = {
    current: null as unknown as ReturnType<typeof useAppointmentActions>,
  };
  let renderer: ReactTestRenderer.ReactTestRenderer;

  function Harness({ value }: { value: ActionableAppointment }) {
    result.current = useAppointmentActions(value, onChanged);
    return null;
  }

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <AuthProvider
        initialSession={session}
        initialAccount={session ? ACCOUNT : null}
      >
        <Harness value={appointment} />
      </AuthProvider>,
    );
  });

  async function rerender(value: ActionableAppointment) {
    await act(async () => {
      renderer.update(
        <AuthProvider initialSession={SESSION} initialAccount={ACCOUNT}>
          <Harness value={value} />
        </AuthProvider>,
      );
    });
  }

  return { result, rerender };
}

beforeEach(() => {
  completeMock.mockReset();
  completeMock.mockResolvedValue({} as never);
  cancelMock.mockReset();
  cancelMock.mockResolvedValue({} as never);
});

test('finaliza com corpo vazio, o id do agendamento e o token da sessão', async () => {
  const { result } = await mountHook();

  await act(async () => result.current.complete());

  expect(completeMock).toHaveBeenCalledWith('id-token', 'appointment-1', {});
});

test('trava enquanto a requisição está em andamento e ignora um segundo toque', async () => {
  let resolve: (value: never) => void = () => {};
  completeMock.mockReturnValue(
    new Promise(done => {
      resolve = done;
    }),
  );
  const { result } = await mountHook();

  let first: Promise<void> = Promise.resolve();
  await act(async () => {
    first = result.current.complete();
  });
  expect(result.current.submitting).toBe(true);

  // Sem esperar o segundo toque: se a trava falhar, ele fica pendurado na
  // mesma promessa e o teste tem que falhar pela contagem, não por timeout.
  let secondTap: Promise<void> = Promise.resolve();
  await act(async () => {
    secondTap = result.current.complete();
  });
  expect(completeMock).toHaveBeenCalledTimes(1);

  await act(async () => {
    resolve({} as never);
    await Promise.all([first, secondTap]);
  });
  expect(result.current.submitting).toBe(false);
});

test('200: avisa a tela para buscar de novo, sem aviso', async () => {
  const onChanged = jest.fn();
  const { result } = await mountHook(SCHEDULED, onChanged);

  await act(async () => result.current.complete());

  expect(onChanged).toHaveBeenCalledTimes(1);
  expect(result.current.notice).toBeNull();
});

test('409 já concluído é tratado como sucesso (reenvio com resposta perdida)', async () => {
  completeMock.mockRejectedValue(
    apiError(409, 'APPOINTMENT_NOT_SCHEDULED', { status: 'COMPLETED' }),
  );
  const onChanged = jest.fn();
  const { result } = await mountHook(SCHEDULED, onChanged);

  await act(async () => result.current.complete());

  expect(onChanged).toHaveBeenCalledTimes(1);
  expect(result.current.notice).toBeNull();
});

test('409 cancelado avisa, busca de novo e o aviso continua visível com o status novo', async () => {
  completeMock.mockRejectedValue(
    apiError(409, 'APPOINTMENT_NOT_SCHEDULED', { status: 'CANCELED' }),
  );
  const onChanged = jest.fn();
  const { result, rerender } = await mountHook(SCHEDULED, onChanged);

  await act(async () => result.current.complete());
  expect(onChanged).toHaveBeenCalledTimes(1);
  expect(result.current.notice).toBe('CANCELED');

  await rerender({ ...SCHEDULED, status: 'CANCELED' });
  expect(result.current.visible).toBe(true);
  expect(result.current.notice).toBe('CANCELED');
});

test('400 sem valor pede para preencher o valor e não busca de novo', async () => {
  completeMock.mockRejectedValue(apiError(400, 'INVALID_REQUEST'));
  const onChanged = jest.fn();
  const { result } = await mountHook(SCHEDULED, onChanged);

  await act(async () => result.current.complete());

  expect(result.current.notice).toBe('AMOUNT_REQUIRED');
  expect(onChanged).not.toHaveBeenCalled();
});

test('404 mostra a mensagem genérica e busca de novo, porque o agendamento sumiu', async () => {
  completeMock.mockRejectedValue(apiError(404, 'APPOINTMENT_NOT_FOUND'));
  const onChanged = jest.fn();
  const { result } = await mountHook(SCHEDULED, onChanged);

  await act(async () => result.current.complete());

  expect(result.current.notice).toBe('FAILED');
  expect(onChanged).toHaveBeenCalledTimes(1);
});

test.each([
  ['500', apiError(500, null)],
  ['401', apiError(401, 'TOKEN_EXPIRED')],
  ['rede', new TypeError('Network request failed')],
])(
  'erro %s mostra a mensagem genérica e não busca de novo',
  async (_label, error) => {
    completeMock.mockRejectedValue(error);
    const onChanged = jest.fn();
    const { result } = await mountHook(SCHEDULED, onChanged);

    await act(async () => result.current.complete());

    expect(result.current.notice).toBe('FAILED');
    expect(onChanged).not.toHaveBeenCalled();
  },
);

test('sem sessão não chama a API e mostra a mensagem genérica', async () => {
  const { result } = await mountHook(SCHEDULED, jest.fn(), null);

  await act(async () => result.current.complete());

  expect(completeMock).not.toHaveBeenCalled();
  expect(result.current.notice).toBe('FAILED');
});

test('uma nova tentativa limpa o aviso anterior', async () => {
  completeMock.mockRejectedValueOnce(apiError(400, 'INVALID_REQUEST'));
  const { result } = await mountHook();

  await act(async () => result.current.complete());
  expect(result.current.notice).toBe('AMOUNT_REQUIRED');

  await act(async () => result.current.complete());
  expect(result.current.notice).toBeNull();
});

test.each([
  ['SCHEDULED', true],
  ['COMPLETED', false],
  ['CANCELED', false],
] as const)('status %s: visível = %s', async (status, visible) => {
  const { result } = await mountHook({ ...SCHEDULED, status });

  expect(result.current.visible).toBe(visible);
});

describe('cancelar', () => {
  const LABELS = {
    noShow: 'Paciente não compareceu',
    clientCanceled: 'Cancelamento do cliente',
    emergency: 'Emergência',
  };

  async function openWithOther(
    reason: string,
    onChanged: () => void = jest.fn(),
    appointment: ActionableAppointment = SCHEDULED,
  ) {
    const mounted = await mountHook(appointment, onChanged);
    await act(async () => mounted.result.current.cancellation.open());
    await act(async () =>
      mounted.result.current.cancellation.setPreset('other'),
    );
    await act(async () =>
      mounted.result.current.cancellation.setReason(reason),
    );
    return mounted;
  }

  test('abrir mostra a folha vazia', async () => {
    const { result } = await mountHook();

    await act(async () => result.current.cancellation.open());

    expect(result.current.cancellation.sheetVisible).toBe(true);
    expect(result.current.cancellation.preset).toBeNull();
    expect(result.current.cancellation.reason).toBe('');
  });

  test('chip sugerido manda o rótulo, fecha a folha, busca de novo e marca o aviso', async () => {
    const onChanged = jest.fn();
    const { result } = await mountHook(SCHEDULED, onChanged);
    await act(async () => result.current.cancellation.open());
    await act(async () => result.current.cancellation.setPreset('noShow'));
    await act(async () => result.current.cancellation.confirm(LABELS));

    expect(cancelMock).toHaveBeenCalledWith(
      'id-token',
      'appointment-1',
      'Paciente não compareceu',
    );
    expect(result.current.cancellation.sheetVisible).toBe(false);
    expect(result.current.justCanceled).toBe(true);
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  test('Outro manda o texto aparado', async () => {
    const onChanged = jest.fn();
    const { result } = await openWithOther('  Paciente faltou  ', onChanged);

    await act(async () => result.current.cancellation.confirm(LABELS));

    expect(cancelMock).toHaveBeenCalledWith(
      'id-token',
      'appointment-1',
      'Paciente faltou',
    );
    expect(result.current.justCanceled).toBe(true);
  });

  test.each([
    ['sem chip', null, '', 'REQUIRED'],
    ['outro vazio', 'other', '', 'REQUIRED'],
    ['outro só espaços', 'other', '   ', 'REQUIRED'],
    ['outro longo demais', 'other', 'a'.repeat(2001), 'TOO_LONG'],
  ] as const)(
    'motivo %s não chama a API e mostra o erro no campo',
    async (_label, preset, reason, expected) => {
      const { result } = await mountHook();
      await act(async () => result.current.cancellation.open());
      if (preset) {
        await act(async () => result.current.cancellation.setPreset(preset));
      }
      await act(async () => result.current.cancellation.setReason(reason));
      await act(async () => result.current.cancellation.confirm(LABELS));

      expect(cancelMock).not.toHaveBeenCalled();
      expect(result.current.cancellation.reasonError).toBe(expected);
      expect(result.current.cancellation.sheetVisible).toBe(true);
    },
  );

  test('digitar de novo limpa o erro do campo', async () => {
    const { result } = await openWithOther('');
    await act(async () => result.current.cancellation.confirm(LABELS));

    await act(async () => result.current.cancellation.setReason('Chuva'));

    expect(result.current.cancellation.reasonError).toBeNull();
  });

  test('409 já cancelado é tratado como sucesso (reenvio com resposta perdida)', async () => {
    cancelMock.mockRejectedValue(
      apiError(409, 'APPOINTMENT_NOT_SCHEDULED', { status: 'CANCELED' }),
    );
    const onChanged = jest.fn();
    const { result } = await openWithOther('Chuva', onChanged);

    await act(async () => result.current.cancellation.confirm(LABELS));

    expect(result.current.cancellation.sheetVisible).toBe(false);
    expect(result.current.notice).toBeNull();
    expect(result.current.justCanceled).toBe(true);
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  test('409 já finalizado fecha a folha, avisa e o aviso continua com o status novo', async () => {
    cancelMock.mockRejectedValue(
      apiError(409, 'APPOINTMENT_NOT_SCHEDULED', { status: 'COMPLETED' }),
    );
    const onChanged = jest.fn();
    const { result, rerender } = await openWithOther('Chuva', onChanged);

    await act(async () => result.current.cancellation.confirm(LABELS));
    expect(result.current.cancellation.sheetVisible).toBe(false);
    expect(result.current.notice).toBe('COMPLETED');
    expect(onChanged).toHaveBeenCalledTimes(1);

    await rerender({ ...SCHEDULED, status: 'COMPLETED' });
    expect(result.current.visible).toBe(true);
  });

  test('404 fecha a folha, avisa e busca de novo', async () => {
    cancelMock.mockRejectedValue(apiError(404, 'APPOINTMENT_NOT_FOUND'));
    const onChanged = jest.fn();
    const { result } = await openWithOther('Chuva', onChanged);

    await act(async () => result.current.cancellation.confirm(LABELS));

    expect(result.current.cancellation.sheetVisible).toBe(false);
    expect(result.current.notice).toBe('CANCEL_FAILED');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['500', apiError(500, null)],
    ['rede', new TypeError('Network request failed')],
  ])(
    'erro %s deixa a folha aberta com o motivo, para tentar de novo',
    async (_label, error) => {
      cancelMock.mockRejectedValue(error);
      const onChanged = jest.fn();
      const { result } = await openWithOther('Chuva', onChanged);

      await act(async () => result.current.cancellation.confirm(LABELS));

      expect(result.current.cancellation.sheetVisible).toBe(true);
      expect(result.current.cancellation.reason).toBe('Chuva');
      expect(result.current.cancellation.failed).toBe(true);
      expect(onChanged).not.toHaveBeenCalled();
    },
  );

  test('uma trava só: com o finalizar em andamento, cancelar não abre nem confirma', async () => {
    let resolve: (value: never) => void = () => {};
    completeMock.mockReturnValue(
      new Promise(done => {
        resolve = done;
      }),
    );
    const { result } = await mountHook();

    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = result.current.complete();
    });
    await act(async () => result.current.cancellation.open());
    expect(result.current.cancellation.sheetVisible).toBe(false);

    await act(async () => {
      resolve({} as never);
      await pending;
    });
  });

  test('não fecha a folha enquanto o cancelamento está em andamento', async () => {
    let resolve: (value: never) => void = () => {};
    cancelMock.mockReturnValue(
      new Promise(done => {
        resolve = done;
      }),
    );
    const { result } = await openWithOther('Chuva');

    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = result.current.cancellation.confirm(LABELS);
    });
    await act(async () => result.current.cancellation.close());
    expect(result.current.cancellation.sheetVisible).toBe(true);

    await act(async () => {
      resolve({} as never);
      await pending;
    });
    expect(result.current.cancellation.sheetVisible).toBe(false);
  });

  test('fechar descarta o motivo digitado', async () => {
    const { result } = await openWithOther('Chuva');

    await act(async () => result.current.cancellation.close());

    expect(result.current.cancellation.sheetVisible).toBe(false);
    expect(result.current.cancellation.reason).toBe('');
  });
});
