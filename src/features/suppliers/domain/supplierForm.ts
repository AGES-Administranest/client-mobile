export type Supplier = {
  id: string;
  name: string;
  email: string | null;
  taxId: string | null;
  phone: string | null;
  active: boolean;
};

export type SupplierField = 'name' | 'email' | 'taxId' | 'phone';

export const SUPPLIER_FIELDS: SupplierField[] = [
  'name',
  'email',
  'taxId',
  'phone',
];

export const SUPPLIER_FIELD_MAX_LENGTH: Record<SupplierField, number> = {
  name: 120,
  email: 120,
  taxId: 18,
  phone: 15,
};

export type SupplierDraft = Record<SupplierField, string> & {
  active: boolean;
};

export type SupplierErrorCode =
  | 'required'
  | 'tooShort'
  | 'invalid'
  | 'duplicated';

export type SupplierDraftErrors = Partial<
  Record<SupplierField, SupplierErrorCode>
>;

export type SupplierPayload = {
  name: string;
  email: string | null;
  taxId: string | null;
  phone: string | null;
  active: boolean;
};

export const EMPTY_SUPPLIER_DRAFT: SupplierDraft = {
  name: '',
  email: '',
  taxId: '',
  phone: '',
  active: true,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_NAME_LENGTH = 2;
const MIN_PHONE_DIGITS = 10;
// Mesma regra do backend: módulo 11; no CNPJ alfanumérico cada caractere pesa
// seu código ASCII − 48.
function isValidCnpj(cnpj: string): boolean {
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj) || /^(.)\1{13}$/.test(cnpj)) {
    return false;
  }
  const values = [...cnpj].map(char => char.charCodeAt(0) - 48);
  const checkDigit = (digits: number[]) => {
    let weight = 2;
    const sum = [...digits].reverse().reduce((total, digit) => {
      const next = total + digit * weight;
      weight = weight === 9 ? 2 : weight + 1;
      return next;
    }, 0);
    return sum % 11 < 2 ? 0 : 11 - (sum % 11);
  };
  const first = checkDigit(values.slice(0, 12));
  const second = checkDigit([...values.slice(0, 12), first]);
  return values[12] === first && values[13] === second;
}

const unmaskTaxId = (value: string) =>
  value.replace(/[^0-9a-z]/gi, '').toUpperCase();

export function supplierToDraft(supplier: Supplier): SupplierDraft {
  return {
    name: supplier.name,
    email: supplier.email ?? '',
    taxId: supplier.taxId ?? '',
    phone: supplier.phone ?? '',
    active: supplier.active,
  };
}

// Só o nome é obrigatório: e-mail, CNPJ e contato são opcionais, mas
// quando preenchidos precisam ser válidos.
export function validateSupplierDraft(
  draft: SupplierDraft,
): SupplierDraftErrors {
  const errors: SupplierDraftErrors = {};
  const name = draft.name.trim();
  const email = draft.email.trim();
  const phone = draft.phone.trim();
  const taxId = draft.taxId.trim();

  if (!name) {
    errors.name = 'required';
  } else if (name.length < MIN_NAME_LENGTH) {
    errors.name = 'tooShort';
  }
  if (email && !EMAIL_PATTERN.test(email)) {
    errors.email = 'invalid';
  }
  if (phone && phone.replace(/\D/g, '').length < MIN_PHONE_DIGITS) {
    errors.phone = 'invalid';
  }
  if (taxId && !isValidCnpj(unmaskTaxId(taxId))) {
    errors.taxId = 'invalid';
  }
  return errors;
}

export function isSupplierDraftValid(errors: SupplierDraftErrors): boolean {
  return Object.keys(errors).length === 0;
}

export function toSupplierPayload(draft: SupplierDraft): SupplierPayload {
  return {
    name: draft.name.trim(),
    email: draft.email.trim() || null,
    taxId: unmaskTaxId(draft.taxId) || null,
    phone: draft.phone.trim() || null,
    active: draft.active,
  };
}
