import {
  DESCRIPTION_MAX_LENGTH,
  changeNature,
  createEmptyDraft,
  isEntryDraftValid,
  maskEntryField,
  selectCategory,
  toCreatePayload,
  validateEntryDraft,
  type EntryDraft,
} from './entryForm';
import type { FinancialCategory } from './financialEntry';

const TRAVEL: FinancialCategory = {
  id: 'cat-travel',
  name: 'Travel',
  nature: 'EXPENSE',
  defaultScope: 'PROFESSIONAL',
};

const VALID: EntryDraft = {
  nature: 'EXPENSE',
  description: 'Combustível',
  amount: '180,00',
  date: '09/08/2026',
  categoryId: 'cat-travel',
  scope: 'PROFESSIONAL',
};

test('starts as an expense dated today, with nothing else filled', () => {
  expect(createEmptyDraft(new Date(2026, 9, 8))).toEqual({
    nature: 'EXPENSE',
    description: '',
    amount: '',
    date: '08/10/2026',
    categoryId: null,
    scope: 'PROFESSIONAL',
  });
});

test('a complete draft has no errors', () => {
  const errors = validateEntryDraft(VALID);

  expect(errors).toEqual({});
  expect(isEntryDraftValid(errors)).toBe(true);
});

describe('amount', () => {
  it.each([
    ['', 'required'],
    ['   ', 'required'],
    ['0,00', 'notPositive'],
    ['abc', 'invalid'],
    ['2.5', 'invalid'],
    ['-5,00', 'invalid'],
    ['1,5', 'invalid'],
    ['0,01', undefined],
    ['1.234,56', undefined],
  ])('%p -> %p', (amount, code) => {
    expect(validateEntryDraft({ ...VALID, amount }).amount).toBe(code);
  });

  test('the mask never lets a negative sign or letters in', () => {
    expect(maskEntryField('amount', '-5')).toBe('0,05');
    expect(maskEntryField('amount', 'abc')).toBe('');
  });
});

describe('date', () => {
  it.each([
    ['', 'required'],
    ['31/02/2026', 'invalid'],
    ['29/02/2027', 'invalid'],
    ['09/08', 'invalid'],
    ['08/10/1926', 'invalid'],
  ])('%p -> %p', (date, code) => {
    expect(validateEntryDraft({ ...VALID, date }).date).toBe(code);
  });

  test('accepts a leap day in a leap year', () => {
    expect(validateEntryDraft({ ...VALID, date: '29/02/2028' }).date).toBe(
      undefined,
    );
  });
});

describe('description and category', () => {
  it.each(['', '   '])('description %p is required', description => {
    expect(validateEntryDraft({ ...VALID, description }).description).toBe(
      'required',
    );
  });

  test('description longer than the API accepts is refused', () => {
    const description = 'a'.repeat(DESCRIPTION_MAX_LENGTH + 1);

    expect(validateEntryDraft({ ...VALID, description }).description).toBe(
      'tooLong',
    );
  });

  test('typing stops at the maximum length', () => {
    expect(
      maskEntryField('description', 'a'.repeat(DESCRIPTION_MAX_LENGTH + 20)),
    ).toHaveLength(DESCRIPTION_MAX_LENGTH);
  });

  test('an emoji at the limit is kept whole or left out, never cut in half', () => {
    const atLimit = 'a'.repeat(DESCRIPTION_MAX_LENGTH - 1) + '😀';
    const pastLimit = 'a'.repeat(DESCRIPTION_MAX_LENGTH) + '😀';

    expect(maskEntryField('description', atLimit)).toBe(atLimit);
    expect(maskEntryField('description', pastLimit)).toBe(
      'a'.repeat(DESCRIPTION_MAX_LENGTH),
    );
    expect(
      validateEntryDraft({ ...VALID, description: atLimit }).description,
    ).toBeUndefined();
  });

  test('category is required', () => {
    expect(validateEntryDraft({ ...VALID, categoryId: null }).categoryId).toBe(
      'required',
    );
  });
});

test('choosing a category suggests its scope, which stays editable', () => {
  const personal = { ...VALID, scope: 'PERSONAL' as const, categoryId: null };

  expect(selectCategory(personal, TRAVEL)).toEqual({
    ...personal,
    categoryId: 'cat-travel',
    scope: 'PROFESSIONAL',
  });
});

test('switching the type drops the category, which belongs to the other type', () => {
  expect(changeNature(VALID, 'INCOME')).toEqual({
    ...VALID,
    nature: 'INCOME',
    categoryId: null,
  });
  expect(changeNature(VALID, 'EXPENSE')).toBe(VALID);
});

test('builds the payload the API expects', () => {
  expect(
    toCreatePayload({ ...VALID, description: '  Combustível  ' }, 'entry-1'),
  ).toEqual({
    id: 'entry-1',
    nature: 'EXPENSE',
    description: 'Combustível',
    amount: 180,
    accrualDate: '2026-08-09T12:00:00.000Z',
    categoryId: 'cat-travel',
    scope: 'PROFESSIONAL',
  });
});

test('refuses to build a payload from an invalid draft', () => {
  expect(() => toCreatePayload({ ...VALID, amount: '' }, 'entry-1')).toThrow();
});
