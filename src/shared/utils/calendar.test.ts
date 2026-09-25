import {
  addMonths,
  buildMonthGrid,
  formatCalendarDate,
  formatDayAndMonth,
  fromCalendarDate,
  isRangeComplete,
  isWithinCalendarRange,
  selectRangeDay,
  toCalendarDate,
} from './calendar';

describe('toCalendarDate', () => {
  it('pads month and day to two digits', () => {
    expect(toCalendarDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('reads the local day of a timestamp, not the UTC one', () => {
    expect(toCalendarDate('2026-09-08T09:30:00')).toBe('2026-09-08');
  });
});

describe('fromCalendarDate', () => {
  it('builds a local date, so the day never shifts backwards', () => {
    const date = fromCalendarDate('2026-09-08');

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(8);
    expect(date.getDate()).toBe(8);
  });

  it('round-trips with toCalendarDate', () => {
    expect(toCalendarDate(fromCalendarDate('2026-02-28'))).toBe('2026-02-28');
  });
});

describe('buildMonthGrid', () => {
  it('always returns six full weeks so the layout never jumps', () => {
    expect(buildMonthGrid(2026, 8)).toHaveLength(42);
  });

  it('starts the grid on the Sunday before the first of the month', () => {
    const grid = buildMonthGrid(2026, 8);

    expect(grid[0].date).toBe('2026-08-30');
    expect(grid[0].isCurrentMonth).toBe(false);
  });

  it('marks the days that belong to the month being shown', () => {
    const grid = buildMonthGrid(2026, 8);
    const inMonth = grid.filter(day => day.isCurrentMonth);

    expect(inMonth).toHaveLength(30);
    expect(inMonth[0].date).toBe('2026-09-01');
    expect(inMonth[29].date).toBe('2026-09-30');
  });

  it('handles a month that starts on a Sunday without an empty first week', () => {
    const grid = buildMonthGrid(2026, 10);

    expect(grid[0].date).toBe('2026-11-01');
    expect(grid[0].isCurrentMonth).toBe(true);
  });

  it('handles February in a leap year', () => {
    const inMonth = buildMonthGrid(2028, 1).filter(day => day.isCurrentMonth);

    expect(inMonth).toHaveLength(29);
    expect(inMonth[28].date).toBe('2028-02-29');
  });
});

describe('addMonths', () => {
  it('moves forward across a year boundary', () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, monthIndex: 0 });
  });

  it('moves backward across a year boundary', () => {
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, monthIndex: 11 });
  });
});

describe('isWithinCalendarRange', () => {
  it('accepts any date when no bound is set', () => {
    expect(isWithinCalendarRange('2026-09-08', { from: null, to: null })).toBe(
      true,
    );
  });

  it('includes both bounds', () => {
    const range = { from: '2026-09-01', to: '2026-09-30' };

    expect(isWithinCalendarRange('2026-09-01', range)).toBe(true);
    expect(isWithinCalendarRange('2026-09-30', range)).toBe(true);
  });

  it('excludes dates outside the bounds', () => {
    const range = { from: '2026-09-01', to: '2026-09-30' };

    expect(isWithinCalendarRange('2026-08-31', range)).toBe(false);
    expect(isWithinCalendarRange('2026-10-01', range)).toBe(false);
  });

  it('matches a single day when both bounds are the same date', () => {
    const range = { from: '2026-09-08', to: '2026-09-08' };

    expect(isWithinCalendarRange('2026-09-08', range)).toBe(true);
    expect(isWithinCalendarRange('2026-09-07', range)).toBe(false);
    expect(isWithinCalendarRange('2026-09-09', range)).toBe(false);
  });

  it('leaves the other side open when only one bound is set', () => {
    expect(
      isWithinCalendarRange('2026-12-31', { from: '2026-09-01', to: null }),
    ).toBe(true);
    expect(
      isWithinCalendarRange('2026-01-01', { from: '2026-09-01', to: null }),
    ).toBe(false);
  });
});

describe('selectRangeDay', () => {
  it('starts a new range when nothing is selected', () => {
    const result = selectRangeDay({ from: null, to: null }, '2026-09-08');

    expect(result).toEqual({ from: '2026-09-08', to: null });
  });

  it('closes the range on a later day', () => {
    const result = selectRangeDay(
      { from: '2026-09-08', to: null },
      '2026-09-15',
    );

    expect(result).toEqual({ from: '2026-09-08', to: '2026-09-15' });
  });

  it('selects a single day when the same day is picked twice', () => {
    const result = selectRangeDay(
      { from: '2026-09-08', to: null },
      '2026-09-08',
    );

    expect(result).toEqual({ from: '2026-09-08', to: '2026-09-08' });
  });

  it('swaps the bounds when the second day comes first', () => {
    const result = selectRangeDay(
      { from: '2026-09-15', to: null },
      '2026-09-08',
    );

    expect(result).toEqual({ from: '2026-09-08', to: '2026-09-15' });
  });

  it('starts over once a range is complete', () => {
    const result = selectRangeDay(
      { from: '2026-09-08', to: '2026-09-15' },
      '2026-09-20',
    );

    expect(result).toEqual({ from: '2026-09-20', to: null });
  });
});

describe('isRangeComplete', () => {
  it.each([
    [{ from: null, to: null }, false],
    [{ from: '2026-09-08', to: null }, false],
    [{ from: '2026-09-08', to: '2026-09-15' }, true],
  ])('%o -> %s', (range, expected) => {
    expect(isRangeComplete(range)).toBe(expected);
  });
});

describe('formatCalendarDate', () => {
  it('formats a calendar date the same way a movement date is formatted', () => {
    expect(formatCalendarDate('2026-08-12', 'pt-BR')).toBe('12 ago');
  });

  it('does not shift the day backwards in a negative UTC offset', () => {
    expect(formatCalendarDate('2026-09-08', 'pt-BR')).toBe('08 set');
    expect(formatCalendarDate('2026-01-01', 'pt-BR')).toBe('01 jan');
  });

  it('follows the locale order', () => {
    expect(formatCalendarDate('2026-08-12', 'en-US')).toBe('Aug 12');
  });
});

describe('formatDayAndMonth', () => {
  it('pads the day by default', () => {
    expect(formatDayAndMonth(new Date(2026, 8, 7), 'pt-BR')).toBe('07 set');
  });

  it('can leave the day unpadded', () => {
    expect(formatDayAndMonth(new Date(2026, 8, 7), 'pt-BR', 'numeric')).toBe(
      '7 set',
    );
    expect(formatDayAndMonth(new Date(2026, 7, 17), 'pt-BR', 'numeric')).toBe(
      '17 ago',
    );
  });

  it('follows the locale order without padding', () => {
    expect(formatDayAndMonth(new Date(2026, 8, 7), 'en-US', 'numeric')).toBe(
      'Sep 7',
    );
  });
});
