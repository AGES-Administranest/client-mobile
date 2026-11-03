export type FixedCostsSummary = {
  professionalExpenses: number;
  personalExpenses: number;
  equipmentDepreciation: number;
  transportCost: number;
  total: number;
};

// The Figma's "Total de custos fixos": personal expenses, depreciation and
// transport (the month's trips). The backend `total` also adds the month's professional
// expenses, which the hourly calculator counts as variable costs instead.
export function fixedCostsTotal(summary: FixedCostsSummary): number {
  return (
    Math.round(
      (summary.personalExpenses +
        summary.equipmentDepreciation +
        summary.transportCost) *
        100,
    ) / 100
  );
}
