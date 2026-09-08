export type ElapsedTime = {
  unit: 'minutes' | 'hours' | 'days';
  value: number;
};

const MINUTES_IN_HOUR = 60;
const MINUTES_IN_DAY = 60 * 24;

// Pure, framework-free business rule — easy to unit test, no React/RN in sight.
export function formatElapsedTime(minutes: number): ElapsedTime {
  const safeMinutes = Math.max(0, Math.floor(minutes));

  if (safeMinutes < MINUTES_IN_HOUR) {
    return { unit: 'minutes', value: safeMinutes };
  }

  // Um alerta de validade fica na lista por até 7 dias, então "há 168 h" é
  // um resultado real se a escala parar nas horas.
  if (safeMinutes < MINUTES_IN_DAY) {
    return { unit: 'hours', value: Math.floor(safeMinutes / MINUTES_IN_HOUR) };
  }

  return { unit: 'days', value: Math.floor(safeMinutes / MINUTES_IN_DAY) };
}

export function elapsedMinutesSince(timestamp: number, now: number): number {
  return Math.max(0, Math.floor((now - timestamp) / 60000));
}
