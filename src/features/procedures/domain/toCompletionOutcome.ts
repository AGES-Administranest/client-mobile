export type CompletionOutcome =
  | 'COMPLETED'
  | 'CANCELED'
  | 'AMOUNT_REQUIRED'
  | 'NOT_FOUND'
  | 'FAILED';

// CANCELED e COMPLETED dizem que o agendamento já saiu de SCHEDULED por outro
// caminho; os demais são falhas da ação que a usuária tentou.
export type AppointmentActionNotice =
  | 'CANCELED'
  | 'COMPLETED'
  | 'AMOUNT_REQUIRED'
  | 'FAILED'
  | 'CANCEL_FAILED';

export type CompletionErrorInfo = {
  status: number;
  code: string | null;
  details: Record<string, unknown> | null;
};

// Resultado de uma tentativa de finalizar que falhou. `null` é falha sem
// resposta do backend (rede, sessão ausente).
export function toCompletionOutcome(
  error: CompletionErrorInfo | null,
): CompletionOutcome {
  if (error === null) {
    return 'FAILED';
  }
  const { status, code, details } = error;

  if (status === 409 && code === 'APPOINTMENT_NOT_SCHEDULED') {
    // Já concluído é o reenvio de uma conclusão cuja resposta se perdeu:
    // o agendamento está exatamente como a usuária queria.
    if (details?.status === 'COMPLETED') {
      return 'COMPLETED';
    }
    if (details?.status === 'CANCELED') {
      return 'CANCELED';
    }
  }
  // Com corpo vazio e um id válido, o único 400 possível é a falta de valor
  // no agendamento. O código é o genérico do backend; um próprio fica como
  // follow-up lá.
  if (status === 400 && code === 'INVALID_REQUEST') {
    return 'AMOUNT_REQUIRED';
  }
  if (status === 404) {
    return 'NOT_FOUND';
  }
  return 'FAILED';
}
