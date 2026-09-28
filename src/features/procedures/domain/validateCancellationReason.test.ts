import {
  CANCELLATION_REASON_MAX_LENGTH,
  validateCancellationReason,
  type CancellationReasonError,
} from './validateCancellationReason';

describe('validateCancellationReason', () => {
  it.each<[string, string, CancellationReasonError | null]>([
    ['vazio', '', 'REQUIRED'],
    ['só espaços', '   ', 'REQUIRED'],
    ['só quebras de linha', '\n\n', 'REQUIRED'],
    ['um caractere', 'x', null],
    ['texto comum', 'Paciente não compareceu', null],
    [
      'no limite, depois de aparar',
      `  ${'a'.repeat(CANCELLATION_REASON_MAX_LENGTH)}  `,
      null,
    ],
    [
      'um acima do limite',
      'a'.repeat(CANCELLATION_REASON_MAX_LENGTH + 1),
      'TOO_LONG',
    ],
  ])('%s', (_label, reason, expected) => {
    expect(validateCancellationReason(reason)).toBe(expected);
  });
});
