import {
  toFinancialEntry,
  type FinancialEntryResponse,
} from './financialEntry';

const RESPONSE: FinancialEntryResponse = {
  id: 'entry-1',
  nature: 'EXPENSE',
  description: 'Combustível',
  category: { id: 'cat-travel', name: 'Travel', scope: 'PROFESSIONAL' },
  scope: 'PROFESSIONAL',
  amount: '180',
  accrualDate: '2026-08-09T12:00:00.000Z',
  source: 'MANUAL',
  origin: { type: 'MANUAL', id: null },
};

it.each([
  ['180', 180],
  ['145.5', 145.5],
  [250, 250],
])('reads the amount %p as the number %p', (amount, value) => {
  expect(toFinancialEntry({ ...RESPONSE, amount }).amount).toBe(value);
});
