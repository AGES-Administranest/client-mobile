import { toInitialReview, toManualReview } from './extractionToFormValues';
import { EMPTY_SERVICE_INVOICE_FORM } from './serviceInvoice.types';

describe('toInitialReview', () => {
  it('fills every field the reading found, ready to edit', () => {
    expect(
      toInitialReview({
        status: 'SUCCESS',
        issueDate: '2026-03-15',
        amount: 1234.56,
        number: ' 2026/42 ',
        taker: { name: 'Clínica Vet', taxId: '12345678000195' },
      }),
    ).toEqual({
      values: {
        issueDate: '15/03/2026',
        amount: '1.234,56',
        number: '2026/42',
        clientId: null,
      },
      readFailed: false,
      client: { selected: null, suggestions: [] },
      newClientPrefill: { name: 'Clínica Vet', taxId: '12345678000195' },
    });
  });

  it('selects the taker the API linked', () => {
    const review = toInitialReview({
      status: 'SUCCESS',
      clientMatch: { id: 'c-1', name: 'Clínica Vet', taxId: '12345678000195' },
    });

    expect(review.values.clientId).toBe('c-1');
    expect(review.client.selected?.id).toBe('c-1');
  });

  it('keeps only what came on a partial reading', () => {
    expect(
      toInitialReview({ status: 'PARTIAL', issueDate: '2026-03-01' }),
    ).toEqual({
      values: {
        issueDate: '01/03/2026',
        amount: '',
        number: '',
        clientId: null,
      },
      readFailed: false,
      client: { selected: null, suggestions: [] },
      newClientPrefill: { name: '', taxId: '' },
    });
  });

  it.each([
    ['a failed reading', { status: 'FAILED' as const }],
    [
      'a failed reading that still carried data',
      { status: 'FAILED' as const, amount: 10, issueDate: '2026-03-01' },
    ],
    ['no reading at all', null],
  ])('leaves every field empty for %s and flags it', (_label, extraction) => {
    expect(toInitialReview(extraction)).toEqual({
      values: EMPTY_SERVICE_INVOICE_FORM,
      readFailed: true,
      client: { selected: null, suggestions: [] },
      newClientPrefill: { name: '', taxId: '' },
    });
  });

  it.each([0, -3])('does not fill a non-positive amount (%p)', amount => {
    expect(toInitialReview({ status: 'SUCCESS', amount }).values.amount).toBe(
      '',
    );
  });

  it('ignores a malformed date', () => {
    expect(
      toInitialReview({ status: 'SUCCESS', issueDate: '15/03/2026' }).values
        .issueDate,
    ).toBe('');
  });

  it('rounds the amount to cents', () => {
    expect(
      toInitialReview({ status: 'SUCCESS', amount: 10.005 }).values.amount,
    ).toBe('10,01');
  });
});

describe('toManualReview', () => {
  it('opens empty without claiming that a reading failed', () => {
    expect(toManualReview()).toEqual({
      values: EMPTY_SERVICE_INVOICE_FORM,
      readFailed: false,
      client: { selected: null, suggestions: [] },
      newClientPrefill: { name: '', taxId: '' },
    });
  });
});
