import {
  EMPTY_SUPPLIER_DRAFT,
  isSupplierDraftValid,
  supplierToDraft,
  toSupplierPayload,
  validateSupplierDraft,
  type SupplierDraft,
} from './supplierForm';

const draft = (overrides: Partial<SupplierDraft>): SupplierDraft => ({
  ...EMPTY_SUPPLIER_DRAFT,
  name: 'Vet Distribuidora',
  ...overrides,
});

describe('validateSupplierDraft', () => {
  it.each([
    ['empty name', { name: '' }, { name: 'required' }],
    ['blank name', { name: '   ' }, { name: 'required' }],
    ['one-letter name', { name: 'A' }, { name: 'tooShort' }],
    ['two-letter name', { name: 'Ab' }, {}],
    ['malformed email', { email: 'sem-arroba' }, { email: 'invalid' }],
    ['email without domain dot', { email: 'a@b' }, { email: 'invalid' }],
    ['valid email', { email: 'contato@vet.com.br' }, {}],
    ['short phone', { phone: '(11) 9999' }, { phone: 'invalid' }],
    ['phone with 10 digits', { phone: '(11) 3456-7890' }, {}],
    ['phone with 11 digits', { phone: '(11) 93456-7890' }, {}],
    ['optional fields blank', { email: ' ', phone: ' ', address: ' ' }, {}],
  ])('%s', (_label, overrides, expected) => {
    expect(validateSupplierDraft(draft(overrides))).toEqual(expected);
  });
});

describe('isSupplierDraftValid', () => {
  it('is true only when there are no errors', () => {
    expect(isSupplierDraftValid({})).toBe(true);
    expect(isSupplierDraftValid({ name: 'required' })).toBe(false);
  });
});

describe('toSupplierPayload', () => {
  it('trims values and turns blank optional fields into null', () => {
    expect(
      toSupplierPayload(
        draft({ name: ' Vet ', email: ' ', address: 'Rua A, 1', phone: '' }),
      ),
    ).toEqual({
      name: 'Vet',
      email: null,
      address: 'Rua A, 1',
      phone: null,
      active: true,
    });
  });
});

describe('supplierToDraft', () => {
  it('maps null fields to empty strings and keeps the status', () => {
    expect(
      supplierToDraft({
        id: '1',
        name: 'Vet',
        email: null,
        address: null,
        phone: '11999990000',
        active: false,
      }),
    ).toEqual({
      name: 'Vet',
      email: '',
      address: '',
      phone: '11999990000',
      active: false,
    });
  });
});
