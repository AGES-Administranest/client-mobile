import type { CompletionErrorInfo } from './toCompletionOutcome';

export type CancellationOutcome =
  | 'CANCELED'
  | 'COMPLETED'
  | 'NOT_FOUND'
  | 'FAILED';

// O inverso do toCompletionOutcome: aqui é "já cancelado" que é sucesso (o
// reenvio de um cancelamento cuja resposta se perdeu), e "já finalizado"
// que impede a ação.
export function toCancellationOutcome(
  error: CompletionErrorInfo | null,
): CancellationOutcome {
  if (error === null) {
    return 'FAILED';
  }
  const { status, code, details } = error;

  if (status === 409 && code === 'APPOINTMENT_NOT_SCHEDULED') {
    if (details?.status === 'CANCELED') {
      return 'CANCELED';
    }
    if (details?.status === 'COMPLETED') {
      return 'COMPLETED';
    }
  }
  if (status === 404) {
    return 'NOT_FOUND';
  }
  return 'FAILED';
}
