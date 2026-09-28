// O mesmo limite do CancelAppointmentDto no backend.
export const CANCELLATION_REASON_MAX_LENGTH = 2000;

export type CancellationReasonError = 'REQUIRED' | 'TOO_LONG';

// O backend aceita um motivo só com espaços (MinLength não apara), então a
// regra de "tem que ter texto" vive aqui.
export function validateCancellationReason(
  reason: string,
): CancellationReasonError | null {
  const trimmed = reason.trim();
  if (trimmed === '') {
    return 'REQUIRED';
  }
  if (trimmed.length > CANCELLATION_REASON_MAX_LENGTH) {
    return 'TOO_LONG';
  }
  return null;
}
