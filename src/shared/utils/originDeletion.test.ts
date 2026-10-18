import { originDeletionEffects } from './originDeletion';

describe('deleting an appointment', () => {
  it.each([
    [
      'a completed one with supplies',
      { hasFinancialEntry: true, hasSupplies: true },
      ['financialEntry', 'suppliesReturn', 'historyRemoval'],
    ],
    [
      'a completed one without supplies',
      { hasFinancialEntry: true, hasSupplies: false },
      ['financialEntry', 'historyRemoval'],
    ],
    [
      'a scheduled one with supplies',
      { hasFinancialEntry: false, hasSupplies: true },
      ['suppliesReturn', 'historyRemoval'],
    ],
    [
      'a scheduled one with nothing else',
      { hasFinancialEntry: false },
      ['historyRemoval'],
    ],
  ] as const)('%s lists only what applies', (_case, facts, effects) => {
    expect(originDeletionEffects('appointment', facts)).toEqual(effects);
  });
});

it('a purchase order takes its entry, its stock and its file', () => {
  expect(
    originDeletionEffects('purchaseInvoice', { hasFinancialEntry: true }),
  ).toEqual(['financialEntry', 'stockRemoval', 'documentRemoval']);
});

it('a service invoice takes its entry and its file', () => {
  expect(
    originDeletionEffects('serviceInvoice', { hasFinancialEntry: true }),
  ).toEqual(['financialEntry', 'documentRemoval']);
});
