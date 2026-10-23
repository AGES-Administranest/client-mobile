import { EMPTY_SERVICE_INVOICE_FORM } from './serviceInvoice.types';
import type { ServiceInvoiceFormValues } from './serviceInvoice.types';
import { validateServiceInvoiceForm } from './validateServiceInvoiceForm';

const VALID: ServiceInvoiceFormValues = {
  issueDate: '15/03/2026',
  amount: '1.234,56',
  number: '2026/0042',
  clientId: 'client-1',
};

const TODAY = new Date(2030, 5, 15, 14, 30);

function validate(overrides: Partial<ServiceInvoiceFormValues> = {}) {
  return validateServiceInvoiceForm({ ...VALID, ...overrides }, TODAY);
}

describe('validateServiceInvoiceForm', () => {
  it('accepts a complete form and builds the input', () => {
    expect(validate()).toEqual({
      errors: {},
      input: {
        issueDate: '2026-03-15',
        amount: 1234.56,
        number: '2026/0042',
        clientId: 'client-1',
      },
    });
  });

  it('accepts the invoice number being empty and leaves it out', () => {
    const result = validate({ number: '   ' });

    expect(result.errors).toEqual({});
    expect(result.input).not.toHaveProperty('number');
  });

  it('trims the invoice number', () => {
    expect(validate({ number: '  42 ' }).input?.number).toBe('42');
  });

  it('reports every missing field on an empty form', () => {
    expect(validateServiceInvoiceForm(EMPTY_SERVICE_INVOICE_FORM)).toEqual({
      errors: {
        issueDate: 'required',
        amount: 'required',
        clientId: 'required',
      },
      input: null,
    });
  });

  describe('issueDate', () => {
    it.each(['', '   '])('requires it (%p)', issueDate => {
      expect(validate({ issueDate }).errors.issueDate).toBe('required');
    });

    it.each(['15/03', '31/02/2026', '00/03/2026', '15/13/2026', '1503202'])(
      'rejects %p as invalid',
      issueDate => {
        expect(validate({ issueDate }).errors.issueDate).toBe('invalid');
      },
    );

    it.each([
      ['today', '15/06/2030'],
      ['yesterday', '14/06/2030'],
      ['a date long ago, as there is no lower bound', '01/01/1900'],
    ])('accepts %s', (_label, issueDate) => {
      expect(validate({ issueDate }).errors.issueDate).toBeUndefined();
    });

    it.each([
      ['tomorrow', '16/06/2030'],
      ['next year', '15/06/2031'],
    ])('rejects %s as in the future', (_label, issueDate) => {
      const result = validate({ issueDate });

      expect(result.errors.issueDate).toBe('future');
      expect(result.input).toBeNull();
    });

    it('does not let the time of day move the boundary', () => {
      const earlyToday = new Date(2030, 5, 15, 0, 0, 1);
      const lateToday = new Date(2030, 5, 15, 23, 59, 59);
      const values = { ...VALID, issueDate: '15/06/2030' };

      expect(
        validateServiceInvoiceForm(values, earlyToday).errors.issueDate,
      ).toBeUndefined();
      expect(
        validateServiceInvoiceForm(values, lateToday).errors.issueDate,
      ).toBeUndefined();
      expect(
        validateServiceInvoiceForm(
          { ...values, issueDate: '16/06/2030' },
          lateToday,
        ).errors.issueDate,
      ).toBe('future');
    });

    it('keeps the first day of the month on the same month', () => {
      expect(validate({ issueDate: '01/03/2026' }).input?.issueDate).toBe(
        '2026-03-01',
      );
    });

    it('accepts the leap day only in a leap year', () => {
      expect(
        validate({ issueDate: '29/02/2028' }).errors.issueDate,
      ).toBeUndefined();
      expect(validate({ issueDate: '29/02/2027' }).errors.issueDate).toBe(
        'invalid',
      );
    });
  });

  describe('amount', () => {
    it.each(['', '  '])('requires it (%p)', amount => {
      expect(validate({ amount }).errors.amount).toBe('required');
    });

    it.each(['0', '0,00', '-5', '-5,00'])(
      'rejects %p as not positive',
      amount => {
        expect(validate({ amount }).errors.amount).toBe('mustBePositive');
      },
    );

    it.each(['abc', 'R$ 10', '10,333', '1,2,3', '12.34'])(
      'rejects %p as invalid',
      amount => {
        expect(validate({ amount }).errors.amount).toBe('invalid');
      },
    );

    it.each([
      ['0,01', 0.01],
      ['10,33', 10.33],
      ['1.234,56', 1234.56],
      ['5', 5],
      ['1.000.000,00', 1000000],
    ])('reads %p as %p', (amount, expected) => {
      const result = validate({ amount });

      expect(result.errors.amount).toBeUndefined();
      expect(result.input?.amount).toBe(expected);
    });
  });

  describe('clientId', () => {
    it.each([null, ''])('is required (%p)', clientId => {
      expect(validate({ clientId }).errors.clientId).toBe('required');
    });
  });
});
