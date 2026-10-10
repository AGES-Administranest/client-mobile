import type { EntryNature, FinancialCategory } from './financialEntry';

export type DefaultCategoryKey =
  | 'professionalFees'
  | 'supplies'
  | 'travel'
  | 'taxesAndFees'
  | 'fixedCosts'
  | 'other';

// As categorias padrão chegam com o nome do seed, em inglês. O nome é o
// que as identifica: os ids não são fixos em todo banco (os testes do
// backend criam outros).
const DEFAULT_CATEGORY_KEYS: Record<string, DefaultCategoryKey> = {
  'Professional fees': 'professionalFees',
  Supplies: 'supplies',
  Travel: 'travel',
  'Taxes and fees': 'taxesAndFees',
  'Fixed costs': 'fixedCosts',
  Other: 'other',
};

const DEFAULT_ORDER: readonly DefaultCategoryKey[] = [
  'professionalFees',
  'supplies',
  'travel',
  'taxesAndFees',
  'fixedCosts',
];

/** Chave de tradução de uma categoria padrão; null para as criadas pelo usuário. */
export function defaultCategoryKey(
  category: Pick<FinancialCategory, 'name'>,
): DefaultCategoryKey | null {
  return DEFAULT_CATEGORY_KEYS[category.name] ?? null;
}

function rank(category: FinancialCategory): number {
  const key = defaultCategoryKey(category);
  if (key === 'other') {
    return DEFAULT_ORDER.length + 1;
  }
  const index = key ? DEFAULT_ORDER.indexOf(key) : -1;
  return index >= 0 ? index : DEFAULT_ORDER.length;
}

/**
 * As do tipo escolhido, na ordem do Figma: as padrão primeiro, depois as do
 * usuário em ordem alfabética e "Outros" por último. A API não ordena.
 */
export function categoriesFor(
  nature: EntryNature,
  categories: readonly FinancialCategory[],
): FinancialCategory[] {
  return categories
    .filter(category => category.nature === nature)
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, 'pt-BR'));
}
