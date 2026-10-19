import {
  byStartTime,
  dayBounds,
  shiftDays,
} from 'features/procedures/domain/appointmentDay';

describe('dayBounds', () => {
  it('covers the whole local day, from midnight to the last millisecond', () => {
    const { from, to } = dayBounds(new Date(2026, 8, 28, 15, 30));

    const start = new Date(from);
    const end = new Date(to);
    expect([start.getDate(), start.getHours(), start.getMinutes()]).toEqual([
      28, 0, 0,
    ]);
    expect([end.getDate(), end.getHours(), end.getMilliseconds()]).toEqual([
      28, 23, 999,
    ]);
  });
});

describe('shiftDays', () => {
  it('moves across a month boundary without touching the original date', () => {
    const original = new Date(2026, 8, 30);

    const next = shiftDays(original, 1);

    expect([next.getMonth(), next.getDate()]).toEqual([9, 1]);
    expect(original.getDate()).toBe(30);
  });
});

describe('byStartTime', () => {
  it('orders appointments by when they start', () => {
    const list = [
      { startsAt: '2026-09-28T15:00:00.000Z' },
      { startsAt: '2026-09-28T09:00:00.000Z' },
    ];

    expect([...list].sort(byStartTime).map(a => a.startsAt)).toEqual([
      '2026-09-28T09:00:00.000Z',
      '2026-09-28T15:00:00.000Z',
    ]);
  });
});
