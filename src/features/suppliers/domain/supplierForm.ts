export type Supplier = {
  id: string;
  name: string;
  email: string | null;
  address: string | null;
  phone: string | null;
  active: boolean;
};

export type SupplierField = 'name' | 'email' | 'address' | 'phone';

export const SUPPLIER_FIELDS: SupplierField[] = [
  'name',
  'email',
  'address',
  'phone',
];

export const SUPPLIER_FIELD_MAX_LENGTH: Record<SupplierField, number> = {
  name: 120,
  email: 120,
  address: 200,
  phone: 15,
};

export type SupplierDraft = Record<SupplierField, string> & {
  active: boolean;
};

export type SupplierErrorCode = 'required' | 'tooShort' | 'invalid';

export type SupplierDraftErrors = Partial<
  Record<SupplierField, SupplierErrorCode>
>;

export type SupplierPayload = {
  name: string;
  email: string | null;
  address: string | null;
  phone: string | null;
  active: boolean;
};

export const EMPTY_SUPPLIER_DRAFT: SupplierDraft = {
  name: '',
  email: '',
  address: '',
  phone: '',
  active: true,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_NAME_LENGTH = 2;
const MIN_PHONE_DIGITS = 10;

export function supplierToDraft(supplier: Supplier): SupplierDraft {
  return {
    name: supplier.name,
    email: supplier.email ?? '',
    address: supplier.address ?? '',
    phone: supplier.phone ?? '',
    active: supplier.active,
  };
}

// Só o nome é obrigatório: e-mail, endereço e contato são opcionais, mas
// quando preenchidos precisam ser válidos.
export function validateSupplierDraft(
  draft: SupplierDraft,
): SupplierDraftErrors {
  const errors: SupplierDraftErrors = {};
  const name = draft.name.trim();
  const email = draft.email.trim();
  const phone = draft.phone.trim();

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
  return errors;
}

export function isSupplierDraftValid(errors: SupplierDraftErrors): boolean {
  return Object.keys(errors).length === 0;
}

export function toSupplierPayload(draft: SupplierDraft): SupplierPayload {
  return {
    name: draft.name.trim(),
    email: draft.email.trim() || null,
    address: draft.address.trim() || null,
    phone: draft.phone.trim() || null,
    active: draft.active,
  };
}
