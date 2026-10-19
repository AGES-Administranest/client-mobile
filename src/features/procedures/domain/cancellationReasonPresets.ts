export const CANCELLATION_REASON_PRESETS = [
  'noShow',
  'clientCanceled',
  'emergency',
  'other',
] as const;

export type CancellationReasonPreset =
  (typeof CANCELLATION_REASON_PRESETS)[number];

export type SuggestedCancellationReason = Exclude<
  CancellationReasonPreset,
  'other'
>;

export type CancellationReasonLabels = Record<
  SuggestedCancellationReason,
  string
>;

// O texto fica sempre à vista: sozinho é o motivo; junto de um chip, detalha
// o chip ("Paciente não compareceu: avisou tarde").
export function resolveCancellationReason(
  preset: CancellationReasonPreset | null,
  text: string,
  labels: CancellationReasonLabels,
): string {
  const detail = text.trim();
  if (preset === null || preset === 'other') {
    return detail;
  }
  return detail === '' ? labels[preset] : `${labels[preset]}: ${detail}`;
}
