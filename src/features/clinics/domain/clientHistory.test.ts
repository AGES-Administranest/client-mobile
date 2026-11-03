import {
  appendAppointments,
  EMPTY_CLIENT_SUMMARY,
  formatHistoryAmount,
  HISTORY_PAGE_SIZE,
  isLastHistoryPage,
  monthPeriodOf,
  remainingAppointments,
  toClientAppointment,
  toClientSummary,
  toHistoryQuery,
  type ClientAppointment,
} from './clientHistory';

function appointment(id: string): ClientAppointment {
  return {
    id,
    startsAt: '2026-08-17T13:00:00.000Z',
    procedureName: 'Orquiectomia',
    patientName: 'Mel',
    amount: 620,
  };
}

describe('monthPeriodOf', () => {
  it.each([
    [new Date(2026, 10, 3), '2026-11-01', '2026-11-30'],
    [new Date(2026, 11, 31), '2026-12-01', '2026-12-31'],
    [new Date(2026, 0, 1), '2026-01-01', '2026-01-31'],
    [new Date(2026, 1, 28), '2026-02-01', '2026-02-28'],
    [new Date(2028, 1, 10), '2028-02-01', '2028-02-29'],
  ])('covers the whole month of %s', (day, from, to) => {
    expect(monthPeriodOf(day)).toEqual({ from, to });
  });
});

describe('toClientAppointment', () => {
  it.each([
    ['620.00', 620],
    ['0.50', 0.5],
    ['1234.56', 1234.56],
    [null, null],
  ])('reads the amount %p as %p', (amount, expected) => {
    expect(
      toClientAppointment({
        id: 'appointment-1',
        startsAt: '2026-08-17T13:00:00.000Z',
        procedureName: null,
        patientName: null,
        amount,
      }).amount,
    ).toBe(expected);
  });
});

test('toClientSummary turns the API decimals into numbers', () => {
  expect(
    toClientSummary({
      appointmentsCount: 6,
      billedTotal: '3420.00',
      tripCost: '96.50',
      tripCount: 6,
    }),
  ).toEqual({
    appointmentsCount: 6,
    billedTotal: 3420,
    tripCost: 96.5,
    tripCount: 6,
  });
});

test('toHistoryQuery sends the period, the page and the page size', () => {
  expect(toHistoryQuery({ from: '2026-08-10', to: '2026-08-24' }, 2)).toBe(
    `from=2026-08-10&to=2026-08-24&page=2&limit=${HISTORY_PAGE_SIZE}`,
  );
});

test('appendAppointments keeps the order and skips repeated appointments', () => {
  const known = [appointment('a'), appointment('b')];

  expect(
    appendAppointments(known, [appointment('b'), appointment('c')]).map(
      item => item.id,
    ),
  ).toEqual(['a', 'b', 'c']);
});

describe('remainingAppointments', () => {
  it.each([
    [6, 4, 2],
    [6, 6, 0],
    [0, 0, 0],
    [3, 4, 0],
  ])(
    'with %i in the period and %i loaded, %i are left',
    (count, loaded, left) => {
      expect(
        remainingAppointments(
          { ...EMPTY_CLIENT_SUMMARY, appointmentsCount: count },
          loaded,
        ),
      ).toBe(left);
    },
  );
});

describe('isLastHistoryPage', () => {
  it.each([
    [0, true],
    [HISTORY_PAGE_SIZE - 1, true],
    [HISTORY_PAGE_SIZE, false],
  ])('a page with %i appointments is the last: %p', (size, last) => {
    const page = Array.from({ length: size }, (_, index) =>
      appointment(`appointment-${index}`),
    );

    expect(isLastHistoryPage(page)).toBe(last);
  });
});

describe('formatHistoryAmount', () => {
  it.each([
    [3420, 'R$ 3.420'],
    [620, 'R$ 620'],
    [96.5, 'R$ 96,50'],
    [1234.56, 'R$ 1.234,56'],
    [0, 'R$ 0'],
  ])('shows %p as %s, with cents only when there are some', (value, shown) => {
    expect(formatHistoryAmount(value, 'pt-BR').replace(/\u00a0/g, ' ')).toBe(
      shown,
    );
  });
});
