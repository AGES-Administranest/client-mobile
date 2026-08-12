import { getGreetingPeriod } from './getGreetingPeriod';

describe('getGreetingPeriod', () => {
  it.each([
    [3, 'night'],
    [8, 'morning'],
    [14, 'afternoon'],
    [20, 'evening'],
  ] as const)('hour %s -> "%s"', (hour, expected) => {
    const date = new Date(2026, 0, 1, hour);

    expect(getGreetingPeriod(date)).toBe(expected);
  });
});
