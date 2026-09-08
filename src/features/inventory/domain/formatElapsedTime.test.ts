import { elapsedMinutesSince, formatElapsedTime } from './formatElapsedTime';

describe('formatElapsedTime', () => {
  it.each([
    [0, 'minutes', 0],
    [10, 'minutes', 10],
    [59, 'minutes', 59],
    [60, 'hours', 1],
    [245, 'hours', 4],
    [1439, 'hours', 23],
    [1440, 'days', 1],
    [10080, 'days', 7],
  ] as const)('%s min -> %s %s', (minutes, unit, value) => {
    expect(formatElapsedTime(minutes)).toEqual({ unit, value });
  });

  it('trata valores negativos como zero', () => {
    expect(formatElapsedTime(-5)).toEqual({ unit: 'minutes', value: 0 });
  });
});

describe('elapsedMinutesSince', () => {
  it('conta minutos inteiros', () => {
    const now = new Date(2026, 8, 8, 12, 0).getTime();
    const before = new Date(2026, 8, 8, 11, 30).getTime();

    expect(elapsedMinutesSince(before, now)).toBe(30);
  });

  // Relógio do aparelho pode voltar; nunca devolver tempo negativo.
  it('nunca devolve negativo', () => {
    expect(elapsedMinutesSince(1000, 0)).toBe(0);
  });
});
