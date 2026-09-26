import type { Client } from './client';
import {
  applyClinicDraft,
  clientToClinicDraft,
  digitsOnly,
  EMPTY_CLINIC_DRAFT,
  formatCnpj,
  formatPhone,
  isClinicDraftValid,
  maskClinicField,
  normalizeState,
  toCreateClientPayload,
  validateClinicDraft,
  type ClinicDraft,
} from './clinicForm';

function draft(overrides: Partial<ClinicDraft> = {}): ClinicDraft {
  return { ...EMPTY_CLINIC_DRAFT, name: 'Clínica VetNova', ...overrides };
}

const FULL_DRAFT: ClinicDraft = {
  name: 'Clínica VetNova',
  cnpj: '11.222.333/0001-81',
  addressLine: 'Rua das Hortênsias, 340 — Jardim Europa',
  city: 'São Paulo',
  state: 'SP',
  phone: '(11) 3456-7890',
  email: 'contato@vetnova.com.br',
  contactName: 'Dr. André Matos',
};

describe('digitsOnly', () => {
  it('keeps only the digits of a masked value', () => {
    expect(digitsOnly('(11) 93456-7890')).toBe('11934567890');
  });

  it('returns an empty string when nothing typed is a digit', () => {
    expect(digitsOnly('abc')).toBe('');
  });
});

describe('formatCnpj', () => {
  it.each([
    ['', ''],
    ['1', '1'],
    ['12', '12'],
    ['123', '12.3'],
    ['12345', '12.345'],
    ['123456', '12.345.6'],
    ['12345678', '12.345.678'],
    ['123456789', '12.345.678/9'],
    ['123456780001', '12.345.678/0001'],
    ['1234567800019', '12.345.678/0001-9'],
    ['12345678000190', '12.345.678/0001-90'],
  ])('masks %p as %p while it is typed', (typed, masked) => {
    expect(formatCnpj(typed)).toBe(masked);
  });

  it('never ends in a separator, so backspace always erases a digit', () => {
    expect(formatCnpj('12.345.678/')).toBe('12.345.678');
  });

  it('ignores anything past the 14th digit', () => {
    expect(formatCnpj('123456780001901')).toBe('12.345.678/0001-90');
  });

  it('re-masks a pasted CNPJ with or without punctuation', () => {
    expect(formatCnpj('12.345.678/0001-90')).toBe('12.345.678/0001-90');
    expect(formatCnpj('12 345 678 0001 90')).toBe('12.345.678/0001-90');
  });
});

describe('formatPhone', () => {
  it.each([
    ['', ''],
    ['1', '(1'],
    ['11', '(11'],
    ['113', '(11) 3'],
    ['113456', '(11) 3456'],
    ['1134567', '(11) 3456-7'],
    ['1134567890', '(11) 3456-7890'],
    ['11934567890', '(11) 93456-7890'],
  ])('masks %p as %p while it is typed', (typed, masked) => {
    expect(formatPhone(typed)).toBe(masked);
  });

  it('moves the hyphen when an 11th digit turns a landline into a mobile', () => {
    expect(formatPhone('(11) 3456-78901')).toBe('(11) 34567-8901');
  });

  it('keeps at most 11 digits', () => {
    expect(formatPhone('119345678901')).toBe('(11) 93456-7890');
  });
});

describe('normalizeState', () => {
  it.each([
    ['sp', 'SP'],
    ['s', 'S'],
    ['r j', 'RJ'],
    ['r1s', 'RS'],
    ['rsx', 'RS'],
  ])('turns %p into %p', (typed, normalized) => {
    expect(normalizeState(typed)).toBe(normalized);
  });
});

describe('maskClinicField', () => {
  it('masks the CNPJ, the phone and the state', () => {
    expect(maskClinicField('cnpj', '12345678000190')).toBe(
      '12.345.678/0001-90',
    );
    expect(maskClinicField('phone', '1134567890')).toBe('(11) 3456-7890');
    expect(maskClinicField('state', 'sp')).toBe('SP');
  });

  it('keeps free-text fields exactly as typed', () => {
    expect(maskClinicField('name', ' Clínica VetNova ')).toBe(
      ' Clínica VetNova ',
    );
    expect(maskClinicField('email', 'Contato@VetNova.com')).toBe(
      'Contato@VetNova.com',
    );
  });
});

describe('validateClinicDraft', () => {
  it('accepts a clinic that has only a name', () => {
    expect(validateClinicDraft(draft())).toEqual({});
  });

  it('accepts a clinic with every field filled', () => {
    expect(validateClinicDraft(FULL_DRAFT)).toEqual({});
  });

  it.each([
    ['', 'required'],
    ['   ', 'required'],
    ['V', 'tooShort'],
    [' V ', 'tooShort'],
    ['VN', undefined],
  ])('checks the name %p', (name, error) => {
    expect(validateClinicDraft(draft({ name })).name).toBe(error);
  });

  it.each([
    ['', undefined],
    ['11.222.333/0001-8', 'invalid'],
    ['11.222.333/0001-81', undefined],
  ])('checks the CNPJ %p', (cnpj, error) => {
    expect(validateClinicDraft(draft({ cnpj })).cnpj).toBe(error);
  });

  it.each([
    ['', undefined],
    ['(11) 3456-789', 'invalid'],
    ['(11) 3456-7890', undefined],
    ['(11) 93456-7890', undefined],
  ])('checks the phone %p', (phone, error) => {
    expect(validateClinicDraft(draft({ phone })).phone).toBe(error);
  });

  it.each([
    ['', undefined],
    ['S', 'invalid'],
    ['XX', 'invalid'],
    ['SP', undefined],
    ['rs', undefined],
  ])('checks the state %p', (state, error) => {
    expect(validateClinicDraft(draft({ state })).state).toBe(error);
  });

  it.each([
    ['', undefined],
    ['contato@vetnova.com.br', undefined],
    ['  contato@vetnova.com  ', undefined],
    ['contato@vetnova', 'invalid'],
    ['a@b.c', 'invalid'],
    ['contato vetnova@x.com', 'invalid'],
    ['contato.vetnova.com', 'invalid'],
  ])('checks the e-mail %p', (email, error) => {
    expect(validateClinicDraft(draft({ email })).email).toBe(error);
  });

  it.each([
    ['11.222.333/0001-80', 'invalid'],
    ['11.111.111/1111-11', 'invalid'],
    ['00.000.000/0000-00', 'invalid'],
    ['11.222.333/0001-81', undefined],
  ])('checks the CNPJ check digits of %p', (cnpj, error) => {
    expect(validateClinicDraft(draft({ cnpj })).cnpj).toBe(error);
  });

  it.each([
    ['(00) 3456-7890', 'invalid'],
    ['(10) 3456-7890', 'invalid'],
    ['(11) 1456-7890', 'invalid'],
    ['(11) 6456-7890', 'invalid'],
    ['(11) 83456-7890', 'invalid'],
    ['(11) 93456-7890', undefined],
    ['(99) 2456-7890', undefined],
  ])('checks the area code and first digit of %p', (phone, error) => {
    expect(validateClinicDraft(draft({ phone })).phone).toBe(error);
  });

  it.each([
    ['', undefined],
    ['Rua A', undefined],
    ['Rua', 'tooShort'],
    ['  R1  ', 'tooShort'],
  ])('checks the address %p', (addressLine, error) => {
    expect(validateClinicDraft(draft({ addressLine })).addressLine).toBe(error);
  });

  it.each([
    ['São Paulo', 'SP', undefined],
    ["D'Ávila-Sul", 'SP', undefined],
    ['S', 'SP', 'tooShort'],
    ['Sao Paulo 2', 'SP', 'invalid'],
    ['São Paulo', '', undefined],
    ['', 'SP', 'required'],
  ])('checks the city %p with state %p', (city, state, error) => {
    expect(validateClinicDraft(draft({ city, state })).city).toBe(error);
  });

  it('asks for the state when only the city was filled', () => {
    expect(validateClinicDraft(draft({ city: 'São Paulo' })).state).toBe(
      'required',
    );
  });

  it.each([
    ['', undefined],
    ['Dr. André Matos', undefined],
    ['A', 'tooShort'],
    ['Dr. 123', 'invalid'],
    ['Dra. Ana <b>', 'invalid'],
  ])('checks the contact name %p', (contactName, error) => {
    expect(validateClinicDraft(draft({ contactName })).contactName).toBe(error);
  });

  it('rejects an e-mail longer than the backend accepts', () => {
    const email = `${'a'.repeat(250)}@x.com`;

    expect(validateClinicDraft(draft({ email })).email).toBe('invalid');
  });

  it('reports every field that failed at once', () => {
    expect(
      validateClinicDraft({
        ...FULL_DRAFT,
        name: '',
        cnpj: '123',
        state: 'XX',
        phone: '11',
        email: 'contato',
      }),
    ).toEqual({
      name: 'required',
      cnpj: 'invalid',
      state: 'invalid',
      phone: 'invalid',
      email: 'invalid',
    });
  });
});

describe('isClinicDraftValid', () => {
  it('is valid only when no field failed', () => {
    expect(isClinicDraftValid({})).toBe(true);
    expect(isClinicDraftValid({ name: 'required' })).toBe(false);
  });
});

describe('toCreateClientPayload', () => {
  it('sends only the type and the trimmed name when nothing else was filled', () => {
    expect(
      toCreateClientPayload(draft({ name: '  Clínica VetNova  ' })),
    ).toStrictEqual({ type: 'CLINIC', name: 'Clínica VetNova' });
  });

  it('sends every filled field in the shape the backend expects', () => {
    expect(toCreateClientPayload(FULL_DRAFT)).toStrictEqual({
      type: 'CLINIC',
      name: 'Clínica VetNova',
      taxId: '11222333000181',
      taxIdType: 'CNPJ',
      addressLine: 'Rua das Hortênsias, 340 — Jardim Europa',
      city: 'São Paulo',
      state: 'SP',
      phone: '1134567890',
      email: 'contato@vetnova.com.br',
      contactName: 'Dr. André Matos',
    });
  });

  it('only sends the CNPJ type together with a CNPJ', () => {
    expect(toCreateClientPayload(draft())).not.toHaveProperty('taxIdType');
    expect(
      toCreateClientPayload(draft({ cnpj: '11.222.333/0001-81' })),
    ).toMatchObject({ taxId: '11222333000181', taxIdType: 'CNPJ' });
  });

  it('leaves out fields that hold only spaces', () => {
    expect(
      toCreateClientPayload(
        draft({ email: '   ', city: ' ', addressLine: '  ', contactName: ' ' }),
      ),
    ).toStrictEqual({ type: 'CLINIC', name: 'Clínica VetNova' });
  });
});

const CLIENT: Client = {
  id: 'client-1',
  type: 'CLINIC',
  name: 'Clínica VetNova',
  taxId: '11222333000181',
  taxIdType: 'CNPJ',
  contactName: 'Dr. André Matos',
  email: 'contato@vetnova.com.br',
  phone: '1134567890',
  addressLine: 'Rua das Hortênsias, 340',
  city: 'São Paulo',
  state: 'SP',
  serviceDays: [],
  paymentTermsDays: null,
  preferredPaymentMethod: null,
  active: true,
  createdAt: '2026-09-23T12:00:00.000Z',
  updatedAt: '2026-09-23T12:00:00.000Z',
};

describe('clientToClinicDraft', () => {
  it('masks the stored digits the way the form shows them', () => {
    expect(clientToClinicDraft(CLIENT)).toStrictEqual({
      name: 'Clínica VetNova',
      cnpj: '11.222.333/0001-81',
      addressLine: 'Rua das Hortênsias, 340',
      city: 'São Paulo',
      state: 'SP',
      phone: '(11) 3456-7890',
      email: 'contato@vetnova.com.br',
      contactName: 'Dr. André Matos',
    });
  });

  it('turns fields that were never filled into empty text', () => {
    expect(
      clientToClinicDraft({
        ...CLIENT,
        taxId: null,
        taxIdType: null,
        phone: null,
        email: null,
        contactName: null,
        addressLine: null,
        city: null,
        state: null,
      }),
    ).toStrictEqual({ ...EMPTY_CLINIC_DRAFT, name: 'Clínica VetNova' });
  });
});

describe('applyClinicDraft', () => {
  it('round-trips a client through its draft', () => {
    expect(applyClinicDraft(CLIENT, clientToClinicDraft(CLIENT))).toStrictEqual(
      CLIENT,
    );
  });

  it('turns emptied fields back into null and keeps the rest of the client', () => {
    expect(
      applyClinicDraft(CLIENT, draft({ name: ' Nova Vet ' })),
    ).toStrictEqual({
      ...CLIENT,
      name: 'Nova Vet',
      taxId: null,
      taxIdType: null,
      addressLine: null,
      city: null,
      state: null,
      phone: null,
      email: null,
      contactName: null,
    });
  });
});
