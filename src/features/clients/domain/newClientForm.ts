import type { ClientType, CreateClientPayload } from './client';

export type NewClientDraft = {
  type: ClientType;
  name: string;
  phone: string;
};

export type NewClientField = 'name' | 'phone';

export type NewClientErrors = {
  name?: 'required' | 'tooShort';
};

export const CLIENT_TYPES: readonly ClientType[] = ['CLINIC', 'INDIVIDUAL'];

export const EMPTY_NEW_CLIENT_DRAFT: NewClientDraft = {
  type: 'CLINIC',
  name: '',
  phone: '',
};

// Mesmos limites do CreateClientDto: o input já corta no máximo, então o
// backend nunca recebe um texto maior do que aceita. O telefone é texto livre
// (o DTO só limita o tamanho e o exemplo dele é "+55 51 99999-0000").
export const NEW_CLIENT_NAME_MAX_LENGTH = 120;
export const NEW_CLIENT_PHONE_MAX_LENGTH = 20;

const NAME_MIN_LENGTH = 2;

export function validateNewClientDraft(draft: NewClientDraft): NewClientErrors {
  const errors: NewClientErrors = {};

  const name = draft.name.trim();
  if (name === '') {
    errors.name = 'required';
  } else if (name.length < NAME_MIN_LENGTH) {
    errors.name = 'tooShort';
  }

  return errors;
}

export function hasNewClientErrors(errors: NewClientErrors): boolean {
  return Object.keys(errors).length > 0;
}

// Telefone vazio fica fora do payload: o campo é opcional no backend.
export function toCreateClientPayload(
  draft: NewClientDraft,
): CreateClientPayload {
  const payload: CreateClientPayload = {
    type: draft.type,
    name: draft.name.trim(),
  };

  const phone = draft.phone.trim();
  if (phone) {
    payload.phone = phone;
  }

  return payload;
}
