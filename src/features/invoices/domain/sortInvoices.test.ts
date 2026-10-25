import type { Invoice } from './invoice.types';
import { sortInvoicesByIssuedAt } from './sortInvoices';

function invoice(number: string, issuedAt: string): Invoice {
  return {
    id: number,
    number,
    kind: 'SERVICE',
    issuerName: 'Emitente',
    takerName: 'Tomador',
    takerCnpj: '12.345.678/0001-90',
    amount: 100,
    issuedAt,
    syncStatus: 'SYNCED',
  };
}

describe('sortInvoicesByIssuedAt', () => {
  it('puts the most recently issued invoice first', () => {
    const sorted = sortInvoicesByIssuedAt([
      invoice('000456', '2026-07-28T10:00:00'),
      invoice('000458', '2026-08-10T10:00:00'),
      invoice('000457', '2026-08-05T10:00:00'),
    ]);

    expect(sorted.map(item => item.number)).toEqual([
      '000458',
      '000457',
      '000456',
    ]);
  });

  it('orders invoices issued the same instant by number, highest first', () => {
    const sorted = sortInvoicesByIssuedAt([
      invoice('000001', '2026-08-10T10:00:00'),
      invoice('000002', '2026-08-10T10:00:00'),
    ]);

    expect(sorted.map(item => item.number)).toEqual(['000002', '000001']);
  });

  it('returns an empty list for an empty list', () => {
    expect(sortInvoicesByIssuedAt([])).toEqual([]);
  });

  it('does not change the list it receives', () => {
    const original = [
      invoice('000456', '2026-07-28T10:00:00'),
      invoice('000458', '2026-08-10T10:00:00'),
    ];
    const snapshot = [...original];

    sortInvoicesByIssuedAt(original);

    expect(original).toEqual(snapshot);
  });
});
