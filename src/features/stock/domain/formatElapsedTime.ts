export type ElapsedTime = {
  unit: 'minutes' | 'hours';
  value: number;
};

// Pure, framework-free business rule — easy to unit test, no React/RN in sight.
export function formatElapsedTime(minutes: number): ElapsedTime {
  const safeMinutes = Math.max(0, Math.floor(minutes));

  if (safeMinutes < 60) {
    return { unit: 'minutes', value: safeMinutes };
  }

  return { unit: 'hours', value: Math.floor(safeMinutes / 60) };
}
