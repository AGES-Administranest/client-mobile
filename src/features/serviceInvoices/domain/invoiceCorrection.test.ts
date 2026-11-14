import { toCorrectionValues, validateCorrection } from './invoiceCorrection';
import type { ServiceInvoiceRecord } from './serviceInvoiceRecord.types';

const record: ServiceInvoiceRecord = {
  id: 'a',
  number: '000458',
  issueDate: '2026-04-22',
  amount: 1284.5,
  clientId: 'c1',
  clientName: 'HospVet Sul',
  location: 'São Paulo, SP',
  hasFile: true,
  syncStatus: 'SYNCED',
  clientTaxId: null,
  file: { name: 'nota.pdf', bytesSize: 2048 },
};

describe('toCorrectionValues', () => {
  it('fills the form with what is saved', () => {
    expect(toCorrectionValues(record)).toEqual({
      issueDate: '22/04/2026',
      amount: '1.284,50',
      number: '000458',
      clientId: 'c1',
      location: 'São Paulo, SP',
    });
  });

  it('leaves the empty optionals empty', () => {
    expect(
      toCorrectionValues({ ...record, number: null, location: null }),
    ).toMatchObject({ number: '', location: '' });
  });
});

describe('validateCorrection', () => {
  const values = toCorrectionValues(record);

  it('turns the typed values into what the backend takes', () => {
    expect(validateCorrection(values, ' Campinas, SP ').input).toEqual({
      issueDate: '2026-04-22',
      amount: 1284.5,
      clientId: 'c1',
      location: 'Campinas, SP',
    });
  });

  it('sends a blank location as null', () => {
    expect(validateCorrection(values, '   ').input?.location).toBeNull();
  });

  it.each([
    [{ amount: '0,00' }, 'amount', 'mustBePositive'],
    [{ amount: '' }, 'amount', 'required'],
    [{ issueDate: '31/02/2026' }, 'issueDate', 'invalid'],
    [{ issueDate: '' }, 'issueDate', 'required'],
    [{ clientId: null }, 'clientId', 'required'],
  ] as const)('refuses %j', (change, field, code) => {
    const result = validateCorrection({ ...values, ...change }, '');

    expect(result.input).toBeNull();
    expect(result.errors[field]).toBe(code);
  });
});
