import { knownCategories, sectionsOf } from './report.types';

describe('sectionsOf', () => {
  it('names each category as the backend does, in the order of the document', () => {
    expect(
      sectionsOf([
        'workedHour',
        'clinics',
        'financial',
        'inventory',
        'travel',
        'suppliers',
        'depreciation',
        'appointments',
      ]),
    ).toEqual([
      'FINANCIAL',
      'APPOINTMENTS',
      'CLIENTS',
      'STOCK',
      'SUPPLIERS',
      'TRIPS',
      'DEPRECIATION',
      'HOURLY_RATE',
    ]);
  });

  it('sends a repeated category once', () => {
    expect(sectionsOf(['travel', 'travel'])).toEqual(['TRIPS']);
  });
});

describe('knownCategories', () => {
  it('drops names that are no longer categories', () => {
    expect(knownCategories(['travel', 'taxes', 42, 'financial'])).toEqual([
      'financial',
      'travel',
    ]);
  });
});
