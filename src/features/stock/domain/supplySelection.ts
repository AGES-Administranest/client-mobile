import type { BackendItem } from 'features/materials';

// O backend descarta o filtro quando `search` tem menos de 2 caracteres
// (QueryItemDto): pedir com 1 caractere devolve o catálogo inteiro, o que na
// tela pareceria uma busca que ignora o que foi digitado. Abaixo disso a lista
// fica vazia à espera de mais um caractere.
export const MIN_SEARCH_LENGTH = 2;

export type SupplyOption = {
  id: string;
  name: string;
  unit: string;
  price: number;
  balance: number;
};

export type SupplySelection = {
  itemId: string;
  name: string;
  unit: string;
  quantity: number;
  // Saldo no instante da escolha: a seção de insumos mostra o aviso de saldo
  // negativo sem ter de consultar o item de novo.
  balance: number;
};

export function isSearchable(term: string): boolean {
  return term.trim().length >= MIN_SEARCH_LENGTH;
}

export function toSupplyOption(
  item: Pick<
    BackendItem,
    'id' | 'name' | 'currentQuantity' | 'defaultUnitCost'
  >,
  unitLabel: string,
): SupplyOption {
  const balance = Number.parseFloat(item.currentQuantity);
  const price = item.defaultUnitCost
    ? Number.parseFloat(item.defaultUnitCost)
    : 0;

  return {
    id: item.id,
    name: item.name,
    unit: unitLabel,
    price: Number.isFinite(price) ? price : 0,
    balance: Number.isFinite(balance) ? balance : 0,
  };
}

// Mesmo formato do MaterialCard ("R$ 19.90"): o separador decimal é ponto em
// toda a lista de materiais, e misturar com o formato local criaria duas
// grafias de preço na mesma tela.
export function formatSupplyPrice(price: number): string {
  return `R$ ${price.toFixed(2)}`;
}

/**
 * Mantém no campo apenas o que forma um número positivo: dígitos e um único
 * separador decimal. Vírgula e ponto são aceitos porque o teclado numérico de
 * iOS e Android oferece um ou outro conforme a região.
 */
export function sanitizeQuantityInput(text: string): string {
  const digitsAndSeparators = text.replace(/[^\d.,]/g, '');
  const firstSeparator = digitsAndSeparators.search(/[.,]/);

  if (firstSeparator === -1) {
    return digitsAndSeparators;
  }

  const whole = digitsAndSeparators.slice(0, firstSeparator);
  const fraction = digitsAndSeparators
    .slice(firstSeparator + 1)
    .replace(/[.,]/g, '');

  return `${whole}.${fraction}`;
}

export function parseQuantity(text: string): number {
  const parsed = Number.parseFloat(sanitizeQuantityInput(text));
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Só avisa, nunca bloqueia: a regra de negócio permite registrar saída maior
 * que o saldo, e o estoque fica negativo até o acerto.
 */
export function exceedsBalance(quantity: number, balance: number): boolean {
  return quantity > balance;
}

export function canConfirm(
  option: SupplyOption | null,
  quantityText: string,
): boolean {
  return option !== null && parseQuantity(quantityText) > 0;
}

export function toSupplySelection(
  option: SupplyOption,
  quantityText: string,
): SupplySelection {
  return {
    itemId: option.id,
    name: option.name,
    unit: option.unit,
    quantity: parseQuantity(quantityText),
    balance: option.balance,
  };
}
