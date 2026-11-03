import type { useTranslation } from 'shared/i18n';
import ptBR from 'shared/i18n/locales/pt-BR.json';
import { translate } from 'shared/i18n/translate';

import { invoiceCardView, invoiceDetailRows } from './invoicePresenter';
import type { Invoice } from '../domain/invoice.types';

const t: ReturnType<typeof useTranslation>['t'] = (key, params) =>
  translate(ptBR, key, params);

const INVOICE: Invoice = {
  id: 'invoice-458',
  number: '000458',
  kind: 'PURCHASE',
  issuerName: 'Vet Farma Distribuidora',
  takerName: 'Clínica Veterinária Boa Vida',
  takerCnpj: '12.345.678/0001-90',
  amount: 1284.5,
  issuedAt: '2026-08-10T12:00:00.000Z',
  syncStatus: 'SYNCED',
};

describe('invoiceCardView', () => {
  it('formats the card the way the design shows it', () => {
    const view = invoiceCardView(INVOICE, t, 'pt-BR');

    expect(view.title).toBe('Nota Fiscal 000458');
    expect(view.date).toBe('10/08/2026');
    expect(view.issuer).toBe('Emitente: Vet Farma Distribuidora');
    expect(view.taker).toBe('Tomador: Clínica Veterinária Boa Vida');
    expect(view.value.replace(/\s/g, ' ')).toBe('R$ 1.284,50');
    expect(view.statusLabel).toBe('Sincronizada');
  });

  it.each([
    ['SYNCED', 'Sincronizada', 'success'],
    ['NOT_SYNCED', 'Não sincronizada', 'attention'],
    ['ERROR', 'Erro no processamento', 'alert'],
  ] as const)('maps %s to its label and tone', (syncStatus, label, tone) => {
    const view = invoiceCardView({ ...INVOICE, syncStatus }, t, 'pt-BR');

    expect(view.statusLabel).toBe(label);
    expect(view.statusTone).toBe(tone);
  });
});

describe('invoiceDetailRows', () => {
  it('lists every field of the invoice', () => {
    const rows = invoiceDetailRows(INVOICE, t, 'pt-BR');

    expect(rows.map(row => row.label)).toEqual([
      'Tipo',
      'Emitente',
      'Tomador',
      'CNPJ do tomador',
      'Valor',
      'Data de emissão',
      'Situação',
    ]);
    expect(rows[0].value).toBe('Compra');
    expect(rows[3].value).toBe('12.345.678/0001-90');
    expect(rows[5].value).toBe('10/08/2026');
  });
});
