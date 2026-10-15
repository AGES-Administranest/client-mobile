import { normalizeForSearch } from 'shared/utils/search';

import type {
  CreateFinancialCategoryPayload,
  EntryNature,
  EntryScope,
  FinancialCategory,
} from './financialEntry';

export type DefaultCategoryKey =
  | 'professionalFees'
  | 'supplies'
  | 'travel'
  | 'taxesAndFees'
  | 'fixedCosts'
  | 'other';

export type LabeledCategory = FinancialCategory & { label: string };

export type NewCategoryNameError = 'required' | 'tooLong' | 'duplicate';

export const CATEGORY_NAME_MAX_LENGTH = 40;

// O seed grava as padrão com nomes em inglês, e o nome é a única coisa que as
// identifica: os ids mudam de um banco para outro.
const DEFAULT_CATEGORY_KEYS: Record<string, DefaultCategoryKey> = {
  'Professional fees': 'professionalFees',
  Supplies: 'supplies',
  Travel: 'travel',
  'Taxes and fees': 'taxesAndFees',
  'Fixed costs': 'fixedCosts',
  Other: 'other',
};

const FIGMA_ORDER: readonly DefaultCategoryKey[] = [
  'professionalFees',
  'supplies',
  'travel',
  'taxesAndFees',
  'fixedCosts',
];

const USER_CATEGORIES_POSITION = FIGMA_ORDER.length;
const OTHER_POSITION = FIGMA_ORDER.length + 1;

export function defaultCategoryKey(
  category: Pick<FinancialCategory, 'name' | 'isDefault'>,
): DefaultCategoryKey | null {
  return category.isDefault === false
    ? null
    : DEFAULT_CATEGORY_KEYS[category.name] ?? null;
}

function listPosition(category: FinancialCategory): number {
  const key = defaultCategoryKey(category);
  if (key === 'other') {
    return OTHER_POSITION;
  }
  const figmaPosition = key ? FIGMA_ORDER.indexOf(key) : -1;
  return figmaPosition >= 0 ? figmaPosition : USER_CATEGORIES_POSITION;
}

export function categoriesFor(
  nature: EntryNature,
  categories: readonly FinancialCategory[],
): FinancialCategory[] {
  return categories
    .filter(category => category.nature === nature)
    .sort(
      (a, b) =>
        listPosition(a) - listPosition(b) ||
        a.name.localeCompare(b.name, 'pt-BR'),
    );
}

// Igual ao backend: sem espaços nas pontas e um só entre as palavras.
function tidyCategoryName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

function categoryNameKey(name: string): string {
  return normalizeForSearch(tidyCategoryName(name));
}

export function filterCategories<Category extends LabeledCategory>(
  categories: readonly Category[],
  term: string,
): Category[] {
  const needle = categoryNameKey(term);
  return categories.filter(category =>
    categoryNameKey(category.label).includes(needle),
  );
}

export function shouldOfferNewCategory(
  term: string,
  matches: readonly LabeledCategory[],
): boolean {
  return categoryNameKey(term) === '' || matches.length === 0;
}

export function findCategoryLabeled<Category extends LabeledCategory>(
  categories: readonly Category[],
  name: string,
): Category | undefined {
  const key = categoryNameKey(name);
  return categories.find(category => categoryNameKey(category.label) === key);
}

// Conta como o MaxLength do backend, por caractere: um emoji vale um, não dois.
const characterCount = (text: string) => Array.from(text).length;

export function validateNewCategoryName(
  name: string,
  categories: readonly LabeledCategory[],
): NewCategoryNameError | undefined {
  const tidy = tidyCategoryName(name);
  if (!tidy) {
    return 'required';
  }
  if (characterCount(tidy) > CATEGORY_NAME_MAX_LENGTH) {
    return 'tooLong';
  }
  return findCategoryLabeled(categories, tidy) ? 'duplicate' : undefined;
}

type NewCategory = {
  id: string;
  name: string;
  nature: EntryNature;
  scope: EntryScope;
};

export function toCreateCategoryPayload({
  id,
  name,
  nature,
  scope,
}: NewCategory): CreateFinancialCategoryPayload {
  return { id, name: tidyCategoryName(name), nature, defaultScope: scope };
}
