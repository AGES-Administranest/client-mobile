import { formatElapsedTime } from './formatElapsedTime';

describe('formatElapsedTime', () => {
  it.each([
    [0, 'minutes', 0],
    [10, 'minutes', 10],
    [59, 'minutes', 59],
    [60, 'hours', 1],
    [119, 'hours', 1],
    [180, 'hours', 3],
  ] as const)('%s min -> %s %s', (minutes, unit, value) => {
    expect(formatElapsedTime(minutes)).toEqual({ unit, value });
  });

  it('clamps negative input to zero', () => {
    expect(formatElapsedTime(-5)).toEqual({ unit: 'minutes', value: 0 });
  });
});
