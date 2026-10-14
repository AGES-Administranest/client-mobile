import {
  CATEGORY_NAME_MAX_LENGTH,
  categoriesFor,
  defaultCategoryKey,
  filterCategories,
  findCategoryLabeled,
  shouldOfferNewCategory,
  toCreateCategoryPayload,
  validateNewCategoryName,
  type LabeledCategory,
} from './financialCategory';
import type { FinancialCategory } from './financialEntry';

const category = (
  name: string,
  nature: FinancialCategory['nature'],
  {
    isDefault = true,
    defaultScope = 'PROFESSIONAL',
  }: Partial<Pick<FinancialCategory, 'isDefault' | 'defaultScope'>> = {},
): FinancialCategory => ({
  id: `${nature}-${name}`,
  name,
  nature,
  defaultScope,
  isDefault,
});

const own = (name: string, nature: FinancialCategory['nature'] = 'EXPENSE') =>
  category(name, nature, { isDefault: false });

const labeled = (label: string): LabeledCategory => ({
  ...own(label),
  label,
});

const SEED: FinancialCategory[] = [
  category('Other', 'EXPENSE'),
  own('Material de escritório'),
  category('Fixed costs', 'EXPENSE'),
  category('Professional fees', 'INCOME'),
  category('Supplies', 'EXPENSE'),
  own('Énfase'),
  own('Other'),
  category('Taxes and fees', 'EXPENSE'),
  category('Other', 'INCOME', { defaultScope: 'PERSONAL' }),
  own('aluguel'),
  category('Travel', 'EXPENSE'),
];

const EXPENSE_LIST: LabeledCategory[] = [
  'Insumos',
  'Deslocamento',
  'Impostos e taxas',
  'Custos fixos',
  'Café',
  'Comida',
  'Outros',
].map(labeled);

const labels = (categories: readonly LabeledCategory[]) =>
  categories.map(c => c.label);

describe('defaultCategoryKey', () => {
  it.each([
    ['Professional fees', 'professionalFees'],
    ['Supplies', 'supplies'],
    ['Travel', 'travel'],
    ['Taxes and fees', 'taxesAndFees'],
    ['Fixed costs', 'fixedCosts'],
    ['Other', 'other'],
    ['Aluguel', null],
  ])('translates the default %p with the key %p', (name, key) => {
    expect(defaultCategoryKey({ name, isDefault: true })).toBe(key);
  });

  it.each(['Other', 'Supplies', 'Travel'])(
    'keeps the name of a user category called %p',
    name => {
      expect(defaultCategoryKey({ name, isDefault: false })).toBeNull();
    },
  );
});

describe('categoriesFor', () => {
  test('lists only the chosen nature: defaults in Figma order, user ones by name, Outros last', () => {
    expect(
      categoriesFor('EXPENSE', SEED).map(c => [c.name, c.isDefault]),
    ).toEqual([
      ['Supplies', true],
      ['Travel', true],
      ['Taxes and fees', true],
      ['Fixed costs', true],
      ['aluguel', false],
      ['Énfase', false],
      ['Material de escritório', false],
      ['Other', false],
      ['Other', true],
    ]);
    expect(categoriesFor('INCOME', SEED).map(c => c.name)).toEqual([
      'Professional fees',
      'Other',
    ]);
  });
});

describe('filterCategories', () => {
  it.each([
    ['insu', ['Insumos']],
    ['cafe', ['Café']],
    ['IMPOSTOS', ['Impostos e taxas']],
    ['  custos   fixos ', ['Custos fixos']],
    ['os', ['Insumos', 'Impostos e taxas', 'Custos fixos', 'Outros']],
    ['xyz', []],
  ])('%p shows %p', (term, expected) => {
    expect(labels(filterCategories(EXPENSE_LIST, term))).toEqual(expected);
  });

  it.each(['', '   '])('an empty term %p keeps the whole list', term => {
    expect(filterCategories(EXPENSE_LIST, term)).toEqual(EXPENSE_LIST);
  });
});

describe('shouldOfferNewCategory', () => {
  it.each([
    ['', EXPENSE_LIST, true],
    ['  ', EXPENSE_LIST, true],
    ['Comi', [labeled('Comida')], false],
    ['Comi', [], true],
  ])('term %p with %# matches offers it: %p', (term, matches, expected) => {
    expect(shouldOfferNewCategory(term, matches)).toBe(expected);
  });
});

describe('findCategoryLabeled', () => {
  it.each([
    [' INSUMOS ', 'Insumos'],
    ['cafe', 'Café'],
    ['Custos   fixos', 'Custos fixos'],
    ['Insumo', undefined],
    ['Comidas', undefined],
  ])('%p is %p', (name, expected) => {
    expect(findCategoryLabeled(EXPENSE_LIST, name)?.label).toBe(expected);
  });
});

describe('validateNewCategoryName', () => {
  it.each([
    ['', 'required'],
    ['   ', 'required'],
    ['a'.repeat(CATEGORY_NAME_MAX_LENGTH), undefined],
    [`  ${'a'.repeat(CATEGORY_NAME_MAX_LENGTH)}  `, undefined],
    ['a'.repeat(CATEGORY_NAME_MAX_LENGTH + 1), 'tooLong'],
    ['😀'.repeat(CATEGORY_NAME_MAX_LENGTH), undefined],
    ['😀'.repeat(CATEGORY_NAME_MAX_LENGTH + 1), 'tooLong'],
    ['insumos', 'duplicate'],
    ['CAFÉ', 'duplicate'],
    ['Honorários', undefined],
    ['Comida caseira', undefined],
  ])('%p → %p', (name, expected) => {
    expect(validateNewCategoryName(name, EXPENSE_LIST)).toBe(expected);
  });
});

describe('toCreateCategoryPayload', () => {
  test('sends the tidied name with the scope chosen in the form as its default', () => {
    expect(
      toCreateCategoryPayload({
        id: 'new-id',
        name: '  Comida   caseira ',
        nature: 'EXPENSE',
        scope: 'PERSONAL',
      }),
    ).toEqual({
      id: 'new-id',
      name: 'Comida caseira',
      nature: 'EXPENSE',
      defaultScope: 'PERSONAL',
    });
  });
});
