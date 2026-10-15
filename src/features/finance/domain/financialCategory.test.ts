import { categoriesFor, defaultCategoryKey } from './financialCategory';
import type { FinancialCategory } from './financialEntry';

const category = (
  name: string,
  nature: FinancialCategory['nature'],
  defaultScope: FinancialCategory['defaultScope'] = 'PROFESSIONAL',
): FinancialCategory => ({
  id: `${nature}-${name}`,
  name,
  nature,
  defaultScope,
});

const SEED: FinancialCategory[] = [
  category('Other', 'EXPENSE'),
  category('Material de escritório', 'EXPENSE'),
  category('Fixed costs', 'EXPENSE'),
  category('Professional fees', 'INCOME'),
  category('Supplies', 'EXPENSE'),
  category('Énfase', 'EXPENSE'),
  category('Aluguel', 'EXPENSE', 'PERSONAL'),
  category('Taxes and fees', 'EXPENSE'),
  category('Other', 'INCOME', 'PERSONAL'),
  category('Travel', 'EXPENSE'),
];

it.each([
  ['Professional fees', 'professionalFees'],
  ['Supplies', 'supplies'],
  ['Travel', 'travel'],
  ['Taxes and fees', 'taxesAndFees'],
  ['Fixed costs', 'fixedCosts'],
  ['Other', 'other'],
  ['Aluguel', null],
])('the label of %p is %p', (name, key) => {
  expect(defaultCategoryKey({ name })).toBe(key);
});

test('lists only the chosen type: defaults first, own ones in alphabetical order, Other last', () => {
  expect(categoriesFor('EXPENSE', SEED).map(c => c.name)).toEqual([
    'Supplies',
    'Travel',
    'Taxes and fees',
    'Fixed costs',
    'Aluguel',
    'Énfase',
    'Material de escritório',
    'Other',
  ]);
  expect(categoriesFor('INCOME', SEED).map(c => c.name)).toEqual([
    'Professional fees',
    'Other',
  ]);
});
