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

export function resolveCancellationReason(
  preset: CancellationReasonPreset | null,
  otherText: string,
  labels: CancellationReasonLabels,
): string {
  if (preset === null) {
    return '';
  }
  if (preset === 'other') {
    return otherText;
  }
  return labels[preset];
}
