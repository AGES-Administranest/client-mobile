import type { Profile } from './profile';
import {
  formatCrmvInput,
  profileToFormValues,
  toProfileUpdate,
  validateProfileForm,
  type ProfileFormValues,
} from './validateProfileForm';

const TODAY = '2026-11-10';

const VALID: ProfileFormValues = {
  name: 'Ana Souza',
  crmv: 'RS-12345',
  birthDate: '15/04/1990',
  sex: 'FEMALE',
  city: 'Porto Alegre',
  state: 'RS',
};

const EMPTY_OPTIONALS: ProfileFormValues = {
  name: 'Ana Souza',
  crmv: '',
  birthDate: '',
  sex: null,
  city: '',
  state: '',
};

describe('validateProfileForm', () => {
  it.each([
    ['a filled-in form', VALID],
    ['the optional fields left empty', EMPTY_OPTIONALS],
  ])('accepts %s', (_case, values) => {
    expect(validateProfileForm(values, TODAY)).toEqual({});
  });

  it.each([
    ['', 'nameTooShort'],
    ['   A  ', 'nameTooShort'],
    ['Al', undefined],
    ['a'.repeat(120), undefined],
    ['a'.repeat(121), 'nameTooLong'],
  ])('name %j → %s', (name, error) => {
    expect(validateProfileForm({ ...VALID, name }, TODAY).name).toBe(error);
  });

  it.each([
    ['RS-1', undefined],
    ['rs-123456', undefined],
    ['RS-1234567', 'crmvInvalid'],
    ['XX-12345', 'crmvInvalid'],
    ['RS', 'crmvInvalid'],
    ['12345', 'crmvInvalid'],
  ])('CRMV %j → %s', (crmv, error) => {
    expect(validateProfileForm({ ...VALID, crmv }, TODAY).crmv).toBe(error);
  });

  it.each([
    ['01/01/1900', undefined],
    ['31/12/1899', 'birthDateOutOfRange'],
    ['10/11/2008', undefined],
    ['11/11/2008', 'birthDateOutOfRange'],
    ['31/02/1990', 'birthDateInvalid'],
    ['15/04/19', 'birthDateInvalid'],
  ])('birth date %j → %s', (birthDate, error) => {
    expect(validateProfileForm({ ...VALID, birthDate }, TODAY).birthDate).toBe(
      error,
    );
  });

  it.each([
    ['a'.repeat(120), undefined],
    ['a'.repeat(121), 'cityTooLong'],
  ])('city of %#: %s', (city, error) => {
    expect(validateProfileForm({ ...VALID, city }, TODAY).city).toBe(error);
  });

  it.each([
    ['sp', undefined],
    ['XX', 'stateInvalid'],
  ])('state %j → %s', (state, error) => {
    expect(validateProfileForm({ ...VALID, state }, TODAY).state).toBe(error);
  });
});

describe('formatCrmvInput', () => {
  it.each([
    ['r', 'R'],
    ['rs', 'RS'],
    ['rs1', 'RS-1'],
    ['RS-12345', 'RS-12345'],
    ['rs 12.345', 'RS-12345'],
    ['RS-12345678', 'RS-123456'],
    ['123', '123'],
  ])('%j → %j', (typed, masked) => {
    expect(formatCrmvInput(typed)).toBe(masked);
  });
});

describe('profileToFormValues and toProfileUpdate', () => {
  const profile: Profile = {
    id: 'user-1',
    name: 'Ana Souza',
    email: 'ana@example.com',
    crmv: 'RS-12345',
    birthDate: '1990-04-15T00:00:00.000Z',
    sex: 'FEMALE',
    city: 'Porto Alegre',
    state: 'RS',
  };

  it('fills the form with the current values and sends them back unchanged', () => {
    const values = profileToFormValues(profile);

    expect(values).toEqual(VALID);
    expect(toProfileUpdate(values)).toEqual({
      name: 'Ana Souza',
      crmv: 'RS-12345',
      birthDate: '1990-04-15',
      sex: 'FEMALE',
      city: 'Porto Alegre',
      state: 'RS',
    });
  });

  it('sends an emptied field as null, so the backend clears it', () => {
    expect(toProfileUpdate({ ...EMPTY_OPTIONALS, name: ' Ana ' })).toEqual({
      name: 'Ana',
      crmv: null,
      birthDate: null,
      sex: null,
      city: null,
      state: null,
    });
  });
});
