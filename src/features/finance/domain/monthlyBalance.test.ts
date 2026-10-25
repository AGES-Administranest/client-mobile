import {
  accrualMonthBounds,
  calculateMonthlyBalance,
  type BalanceEntry,
} from './monthlyBalance';

const MARCH = { month: 3, year: 2026 };

function entry(overrides: Partial<BalanceEntry> = {}): BalanceEntry {
  return {
    nature: 'EXPENSE',
    scope: 'PROFESSIONAL',
    amount: 0,
    accrualDate: '2026-03-15T12:00:00.000Z',
    categoryName: 'Other',
    ...overrides,
  };
}

const MARCH_ENTRIES: BalanceEntry[] = [
  entry({
    nature: 'INCOME',
    amount: 1000,
    categoryName: 'Professional fees',
    accrualDate: '2026-03-10T12:00:00.000Z',
  }),
  entry({
    amount: 100.1,
    categoryName: 'Supplies',
    accrualDate: '2026-03-12T12:00:00.000Z',
  }),
  entry({
    amount: 40,
    categoryName: 'Travel',
    accrualDate: '2026-03-15T12:00:00.000Z',
  }),
  entry({
    amount: 30,
    categoryName: 'Fixed costs',
    accrualDate: '2026-03-20T12:00:00.000Z',
  }),
  entry({
    nature: 'EXPENSE',
    scope: 'PERSONAL',
    amount: 20,
    categoryName: 'Taxes and fees',
    accrualDate: '2026-03-22T12:00:00.000Z',
  }),
  entry({
    amount: 4,
    categoryName: 'Other',
    accrualDate: '2026-03-25T12:00:00.000Z',
  }),
  entry({
    scope: 'PERSONAL',
    amount: 5.15,
    categoryName: 'Custom',
    accrualDate: '2026-03-26T12:00:00.000Z',
  }),
];

describe('accrualMonthBounds', () => {
  it('is the UTC month, closed at the start and open at the next month', () => {
    expect(accrualMonthBounds(MARCH)).toEqual({
      from: Date.parse('2026-03-01T00:00:00.000Z'),
      to: Date.parse('2026-04-01T00:00:00.000Z'),
    });
  });
});

describe('calculateMonthlyBalance', () => {
  const complete = { depreciation: 0, transport: 0 };

  it('matches the backend totals and groups for the month', () => {
    expect(
      calculateMonthlyBalance(MARCH_ENTRIES, MARCH, complete),
    ).toMatchObject({
      revenue: 1000,
      professionalExpenses: 174.1,
      personalExpenses: 25.15,
      totalExpenses: 199.25,
      netBalance: 800.75,
      incomplete: false,
      expensesByCategory: [
        { category: 'SUPPLIES', subtotal: 100.1 },
        { category: 'TRAVEL', subtotal: 40 },
        { category: 'FIXED_COSTS', subtotal: 30 },
        { category: 'TAXES_AND_FEES', subtotal: 20 },
        { category: 'OTHER', subtotal: 9.15 },
      ],
    });
  });

  it('drops a deleted row and a row outside the UTC month', () => {
    const balance = calculateMonthlyBalance(
      [
        ...MARCH_ENTRIES,
        entry({
          amount: 999,
          categoryName: 'Supplies',
          deletedAt: '2026-03-13T00:00:00.000Z',
        }),
        entry({
          nature: 'INCOME',
          amount: 80,
          accrualDate: '2026-02-28T21:00:00.000Z',
          categoryName: 'Professional fees',
        }),
        entry({
          nature: 'INCOME',
          amount: 70,
          accrualDate: '2026-04-01T00:00:00.000Z',
          categoryName: 'Professional fees',
        }),
      ],
      MARCH,
      complete,
    );

    expect(balance.revenue).toBe(1000);
    expect(balance.professionalExpenses).toBe(174.1);
  });

  it('keeps the first instant of the month and a pending sync entry', () => {
    const balance = calculateMonthlyBalance(
      [
        entry({
          nature: 'INCOME',
          amount: 10,
          accrualDate: '2026-03-01T00:00:00.000Z',
          categoryName: 'Professional fees',
          status: 'PENDING',
        }),
        entry({
          amount: 3.5,
          categoryName: 'Supplies',
          pendingSync: true,
          status: 'PENDING',
        }),
        entry({
          amount: 1,
          categoryName: 'Travel',
          status: 'CANCELED',
        }),
      ],
      MARCH,
      complete,
    );

    expect(balance.revenue).toBe(10);
    expect(balance.professionalExpenses).toBe(4.5);
    expect(balance.netBalance).toBe(5.5);
  });

  it('ignores a pending entry that was deleted or falls in another month', () => {
    const balance = calculateMonthlyBalance(
      [
        entry({
          amount: 8,
          pendingSync: true,
          deletedAt: '2026-03-02T00:00:00.000Z',
        }),
        entry({
          amount: 9,
          pendingSync: true,
          accrualDate: '2026-04-01T00:00:00.000Z',
        }),
      ],
      MARCH,
      complete,
    );

    expect(balance.totalExpenses).toBe(0);
    expect(balance.netBalance).toBe(0);
  });

  it('is zero, with every group, when the month has no entries', () => {
    const balance = calculateMonthlyBalance([], MARCH, complete);

    expect(balance).toMatchObject({
      revenue: 0,
      professionalExpenses: 0,
      personalExpenses: 0,
      totalExpenses: 0,
      netBalance: 0,
      incomplete: false,
    });
    expect(balance.expensesByCategory.map(item => item.subtotal)).toEqual([
      0, 0, 0, 0, 0,
    ]);
  });

  it('adds local depreciation and transport to the professional total', () => {
    const balance = calculateMonthlyBalance(MARCH_ENTRIES, MARCH, {
      depreciation: 10,
      transport: 2.5,
    });

    expect(balance.professionalExpenses).toBe(186.6);
    expect(balance.netBalance).toBe(788.25);
    expect(balance.expensesByCategory[2]).toEqual({
      category: 'FIXED_COSTS',
      subtotal: 42.5,
    });
    expect(balance.incomplete).toBe(false);
  });

  it('warns when depreciation or transport is not on the device', () => {
    expect(
      calculateMonthlyBalance(MARCH_ENTRIES, MARCH, {
        depreciation: 10,
        transport: null,
      }).incomplete,
    ).toBe(true);
    expect(calculateMonthlyBalance(MARCH_ENTRIES, MARCH).incomplete).toBe(true);
  });

  it('is negative when expenses pass income', () => {
    const balance = calculateMonthlyBalance(
      [
        entry({
          nature: 'INCOME',
          amount: 10,
          categoryName: 'Professional fees',
        }),
        entry({ amount: 25.5, categoryName: 'Supplies' }),
      ],
      MARCH,
      complete,
    );

    expect(balance.netBalance).toBe(-15.5);
  });
});
