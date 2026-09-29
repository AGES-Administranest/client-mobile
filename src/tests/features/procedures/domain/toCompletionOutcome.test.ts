import {
  toCompletionOutcome,
  type CompletionErrorInfo,
  type CompletionOutcome,
} from 'features/procedures/domain/toCompletionOutcome';

function error(
  status: number,
  code: string | null,
  details: Record<string, unknown> | null = null,
): CompletionErrorInfo {
  return { status, code, details };
}

describe('toCompletionOutcome', () => {
  it.each<[string, CompletionErrorInfo | null, CompletionOutcome]>([
    [
      '409 já concluído vira sucesso',
      error(409, 'APPOINTMENT_NOT_SCHEDULED', { status: 'COMPLETED' }),
      'COMPLETED',
    ],
    [
      '409 cancelado',
      error(409, 'APPOINTMENT_NOT_SCHEDULED', { status: 'CANCELED' }),
      'CANCELED',
    ],
    ['409 sem details', error(409, 'APPOINTMENT_NOT_SCHEDULED'), 'FAILED'],
    [
      '409 com status inesperado',
      error(409, 'APPOINTMENT_NOT_SCHEDULED', { status: 'SCHEDULED' }),
      'FAILED',
    ],
    [
      '409 de outro código',
      error(409, 'APPOINTMENT_TIME_CONFLICT', { status: 'COMPLETED' }),
      'FAILED',
    ],
    [
      '400 por falta de valor',
      error(400, 'INVALID_REQUEST'),
      'AMOUNT_REQUIRED',
    ],
    ['400 de validação do corpo', error(400, 'VALIDATION_ERROR'), 'FAILED'],
    ['404 agendamento sumiu', error(404, 'APPOINTMENT_NOT_FOUND'), 'NOT_FOUND'],
    ['401 sessão expirada', error(401, 'TOKEN_EXPIRED'), 'FAILED'],
    ['500 sem código', error(500, null), 'FAILED'],
    ['falha sem resposta (rede)', null, 'FAILED'],
  ])('%s', (_label, input, expected) => {
    expect(toCompletionOutcome(input)).toBe(expected);
  });
});
