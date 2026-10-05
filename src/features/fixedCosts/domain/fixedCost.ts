export type FixedCostCategory =
  | 'RENT'
  | 'WATER'
  | 'ELECTRICITY'
  | 'INTERNET'
  | 'PHONE'
  | 'ACCOUNTANT'
  | 'OTHER';

export const FIXED_COST_CATEGORIES: readonly FixedCostCategory[] = [
  'RENT',
  'WATER',
  'ELECTRICITY',
  'INTERNET',
  'PHONE',
  'ACCOUNTANT',
  'OTHER',
];

// Custo fixo mensal (US18): recorrente até que o profissional o desative —
// por isso não há exclusão, só `active: false` (ver README, "Calling the
// API", e o comentário de `updateFixedCost` em services/fixedCostService.ts).
export type FixedCost = {
  id: string;
  description: string;
  monthlyAmount: number;
  category: FixedCostCategory;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
