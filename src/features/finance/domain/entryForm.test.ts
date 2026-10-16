import {
  DESCRIPTION_MAX_LENGTH,
  changeNature,
  createEmptyDraft,
  draftFromEntry,
  hasDraftChanges,
  isEntryDraftValid,
  maskEntryField,
  selectCategory,
  toCreatePayload,
  toUpdatePayload,
  validateEntryDraft,
  type EntryDraft,
} from './entryForm';
import type { FinancialCategory, FinancialEntry } from './financialEntry';

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

const SAVED: FinancialEntry = {
  id: 'entry-1',
  nature: 'EXPENSE',
  description: 'Combustível',
  category: { id: 'cat-travel', name: 'Travel', scope: 'PROFESSIONAL' },
  scope: 'PROFESSIONAL',
  amount: 180,
  accrualDate: '2026-08-09T12:00:00.000Z',
  source: 'MANUAL',
  origin: { type: 'MANUAL', id: null },
};

const FROM_APPOINTMENT: FinancialEntry = {
  ...SAVED,
  nature: 'INCOME',
  description: 'Orquiectomia',
  category: {
    id: 'cat-fees',
    name: 'Professional fees',
    scope: 'PROFESSIONAL',
  },
  amount: 620,
  accrualDate: '2026-08-17T13:30:00.000Z',
  source: 'APPOINTMENT',
  origin: { type: 'APPOINTMENT', id: 'apt-1' },
};

describe('editing a saved entry', () => {
  test('fills the form with the saved entry', () => {
    expect(draftFromEntry(SAVED)).toEqual(VALID);
  });

  test.each([
    [0.5, '0,50'],
    [1234.56, '1.234,56'],
    [250, '250,00'],
  ])('shows the amount %p as %p', (amount, masked) => {
    expect(draftFromEntry({ ...SAVED, amount }).amount).toBe(masked);
  });

  test('has no changes until a field differs from the saved entry', () => {
    expect(hasDraftChanges(VALID, SAVED)).toBe(false);
    expect(
      hasDraftChanges({ ...VALID, description: ' Combustível ' }, SAVED),
    ).toBe(false);
    expect(hasDraftChanges({ ...VALID, scope: 'PERSONAL' }, SAVED)).toBe(true);
  });

  test('sends only the fields that changed', () => {
    expect(
      toUpdatePayload(
        { ...VALID, description: ' Gasolina ', amount: '200,00' },
        SAVED,
      ),
    ).toEqual({ description: 'Gasolina', amount: 200 });
  });

  test('sends nothing when nothing changed', () => {
    expect(toUpdatePayload(VALID, SAVED)).toEqual({});
  });

  test('sends a new date at noon UTC, like a new entry', () => {
    expect(toUpdatePayload({ ...VALID, date: '10/08/2026' }, SAVED)).toEqual({
      accrualDate: '2026-08-10T12:00:00.000Z',
    });
  });

  test('sends the new type together with a category of that type', () => {
    expect(
      toUpdatePayload(
        { ...VALID, nature: 'INCOME', categoryId: 'cat-fees' },
        SAVED,
      ),
    ).toEqual({ nature: 'INCOME', categoryId: 'cat-fees' });
  });

  test('never sends type, amount or date of an automatic entry', () => {
    const draft = {
      ...draftFromEntry(FROM_APPOINTMENT),
      nature: 'EXPENSE' as const,
      amount: '1,00',
      date: '01/01/2026',
      description: 'Orquiectomia – Mel',
      scope: 'PERSONAL' as const,
    };
    expect(toUpdatePayload(draft, FROM_APPOINTMENT)).toEqual({
      description: 'Orquiectomia – Mel',
      scope: 'PERSONAL',
    });
  });

  test('refuses to build an update from an invalid draft', () => {
    expect(() =>
      toUpdatePayload({ ...VALID, categoryId: null }, SAVED),
    ).toThrow();
  });
});
