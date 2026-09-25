import {
  CLIENT_TYPES,
  EMPTY_NEW_CLIENT_DRAFT,
  hasNewClientErrors,
  NEW_CLIENT_NAME_MAX_LENGTH,
  NEW_CLIENT_PHONE_MAX_LENGTH,
  toCreateClientPayload,
  validateNewClientDraft,
  type NewClientDraft,
} from './newClientForm';

const valid: NewClientDraft = {
  type: 'CLINIC',
  name: 'Clínica VetCenter',
  phone: '+55 51 99999-0000',
};

describe('validateNewClientDraft', () => {
  it('não retorna erros para um cadastro válido', () => {
    expect(validateNewClientDraft(valid)).toEqual({});
  });

  it('aceita só o nome (telefone é opcional)', () => {
    expect(validateNewClientDraft({ ...valid, phone: '' })).toEqual({});
  });

  it.each([
    ['', 'required'],
    ['   ', 'required'],
    ['A', 'tooShort'],
    [' A ', 'tooShort'],
    ['Jo', undefined],
  ])('nome %j → %s', (name, code) => {
    expect(validateNewClientDraft({ ...valid, name }).name).toBe(code);
  });
});

describe('hasNewClientErrors', () => {
  it('reflete se há algum erro', () => {
    expect(hasNewClientErrors({})).toBe(false);
    expect(hasNewClientErrors({ name: 'required' })).toBe(true);
  });
});

describe('contrato do CreateClientDto', () => {
  it('o tipo só assume os valores exatos do enum do backend', () => {
    expect(CLIENT_TYPES).toEqual(['CLINIC', 'INDIVIDUAL']);
  });

  it('os limites são os do DTO (nome 120, telefone 20)', () => {
    expect(NEW_CLIENT_NAME_MAX_LENGTH).toBe(120);
    expect(NEW_CLIENT_PHONE_MAX_LENGTH).toBe(20);
  });
});

describe('toCreateClientPayload', () => {
  it('envia tipo, nome sem espaços nas pontas e o telefone como digitado', () => {
    expect(
      toCreateClientPayload({
        type: 'INDIVIDUAL',
        name: '  Maria Souza ',
        phone: ' +55 51 99999-0000 ',
      }),
    ).toEqual({
      type: 'INDIVIDUAL',
      name: 'Maria Souza',
      phone: '+55 51 99999-0000',
    });
  });

  it('omite o telefone vazio em vez de mandar string vazia', () => {
    expect(toCreateClientPayload({ ...valid, phone: '  ' })).not.toHaveProperty(
      'phone',
    );
  });

  it('nunca inclui campos fora do cadastro rápido', () => {
    expect(Object.keys(toCreateClientPayload(valid)).sort()).toEqual([
      'name',
      'phone',
      'type',
    ]);
  });

  it('o rascunho inicial é uma clínica sem dados', () => {
    expect(EMPTY_NEW_CLIENT_DRAFT).toEqual({
      type: 'CLINIC',
      name: '',
      phone: '',
    });
  });
});
