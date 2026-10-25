import { resolveInitialClient, toNewClientPrefill } from './initialClient';
import type { ExtractedClient } from './serviceInvoice.types';

const MATCH: ExtractedClient = {
  id: 'c-1',
  name: 'Clínica Sul',
  taxId: '12345678000195',
};
const SUGGESTIONS: ExtractedClient[] = [
  { id: 'c-2', name: 'Clínica Norte', taxId: '11222333000181' },
  { id: 'c-3', name: 'Clínica Leste', taxId: '22333444000155' },
];

describe('resolveInitialClient', () => {
  it('selects the linked taker', () => {
    expect(
      resolveInitialClient({ status: 'SUCCESS', clientMatch: MATCH }),
    ).toEqual({ selected: MATCH, suggestions: [] });
  });

  it('offers the suggestions when nothing was linked', () => {
    expect(
      resolveInitialClient({
        status: 'SUCCESS',
        clientSuggestions: SUGGESTIONS,
      }),
    ).toEqual({ selected: null, suggestions: SUGGESTIONS });
  });

  it('selects nothing without a link or suggestions', () => {
    expect(resolveInitialClient({ status: 'PARTIAL' })).toEqual({
      selected: null,
      suggestions: [],
    });
  });

  it('lets the link win over the suggestions', () => {
    expect(
      resolveInitialClient({
        status: 'SUCCESS',
        clientMatch: MATCH,
        clientSuggestions: SUGGESTIONS,
      }),
    ).toEqual({ selected: MATCH, suggestions: [] });
  });

  it.each([
    ['a failed reading', { status: 'FAILED' as const, clientMatch: MATCH }],
    ['no reading at all', null],
  ])('selects nothing for %s', (_label, extraction) => {
    expect(resolveInitialClient(extraction)).toEqual({
      selected: null,
      suggestions: [],
    });
  });
});

describe('toNewClientPrefill', () => {
  it('carries the name and CNPJ read from the note', () => {
    expect(
      toNewClientPrefill({
        status: 'SUCCESS',
        taker: { name: ' Clínica Nova ', taxId: '12345678000195' },
      }),
    ).toEqual({ name: 'Clínica Nova', taxId: '12345678000195' });
  });

  it.each([
    [
      'name',
      { taxId: '12345678000195' },
      { name: '', taxId: '12345678000195' },
    ],
    ['CNPJ', { name: 'Clínica Nova' }, { name: 'Clínica Nova', taxId: '' }],
    ['taker', undefined, { name: '', taxId: '' }],
  ])('lets the %s be missing', (_label, taker, expected) => {
    expect(toNewClientPrefill({ status: 'PARTIAL', taker })).toEqual(expected);
  });

  it.each([
    ['a failed reading', { status: 'FAILED' as const, taker: { name: 'X' } }],
    ['no reading at all', null],
  ])('is empty for %s', (_label, extraction) => {
    expect(toNewClientPrefill(extraction)).toEqual({ name: '', taxId: '' });
  });
});
