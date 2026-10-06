import type { FixedCost } from './fixedCost';

export function sumActiveMonthlyAmount(
  fixedCosts: readonly FixedCost[],
): number {
  return fixedCosts
    .filter(fixedCost => fixedCost.active)
    .reduce((total, fixedCost) => total + fixedCost.monthlyAmount, 0);
}

export function countActiveFixedCosts(
  fixedCosts: readonly FixedCost[],
): number {
  return fixedCosts.filter(fixedCost => fixedCost.active).length;
}
