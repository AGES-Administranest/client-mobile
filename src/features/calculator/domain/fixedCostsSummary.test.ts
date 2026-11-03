import { fixedCostsTotal } from './fixedCostsSummary';

describe('fixedCostsTotal', () => {
  const SUMMARY = {
    professionalExpenses: 1225,
    personalExpenses: 860,
    equipmentDepreciation: 189.08,
    transportCost: 350,
    total: 2624.08,
  };

  it.each([
    [SUMMARY, 1399.08],
    [{ ...SUMMARY, transportCost: 0 }, 1049.08],
    [{ ...SUMMARY, professionalExpenses: 99999 }, 1399.08],
    [
      {
        ...SUMMARY,
        personalExpenses: 0.1,
        equipmentDepreciation: 0.2,
        transportCost: 0,
      },
      0.3,
    ],
    [
      {
        ...SUMMARY,
        personalExpenses: 0,
        equipmentDepreciation: 0,
        transportCost: 0,
      },
      0,
    ],
  ])(
    'adds personal, depreciation and transport of %o into %p',
    (summary, expected) => {
      expect(fixedCostsTotal(summary)).toBe(expected);
    },
  );
});
