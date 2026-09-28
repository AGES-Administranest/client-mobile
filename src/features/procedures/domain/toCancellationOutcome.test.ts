import {
  toCancellationOutcome,
  type CancellationOutcome,
} from './toCancellationOutcome';
import type { CompletionErrorInfo } from './toCompletionOutcome';

function error(
  status: number,
  code: string | null,
  details: Record<string, unknown> | null = null,
): CompletionErrorInfo {
  return { status, code, details };
}

describe('toCancellationOutcome', () => {
  it.each<[string, CompletionErrorInfo | null, CancellationOutcome]>([
    [
      '409 já cancelado vira sucesso',
      error(409, 'APPOINTMENT_NOT_SCHEDULED', { status: 'CANCELED' }),
      'CANCELED',
    ],
    [
      '409 já finalizado',
      error(409, 'APPOINTMENT_NOT_SCHEDULED', { status: 'COMPLETED' }),
      'COMPLETED',
    ],
    ['409 sem details', error(409, 'APPOINTMENT_NOT_SCHEDULED'), 'FAILED'],
    [
      '409 de outro código',
      error(409, 'APPOINTMENT_TIME_CONFLICT', { status: 'CANCELED' }),
      'FAILED',
    ],
    ['400 de validação do motivo', error(400, 'VALIDATION_ERROR'), 'FAILED'],
    ['404 agendamento sumiu', error(404, 'APPOINTMENT_NOT_FOUND'), 'NOT_FOUND'],
    ['401 sessão expirada', error(401, 'TOKEN_EXPIRED'), 'FAILED'],
    ['500 sem código', error(500, null), 'FAILED'],
    ['falha sem resposta (rede)', null, 'FAILED'],
  ])('%s', (_label, input, expected) => {
    expect(toCancellationOutcome(input)).toBe(expected);
  });
});
