import {
  canConfirm,
  exceedsBalance,
  formatSupplyPrice,
  isSearchable,
  parseQuantity,
  sanitizeQuantityInput,
  toSupplyOption,
  toSupplySelection,
  type SupplyOption,
} from './supplySelection';

const OPTION: SupplyOption = {
  id: 'item-1',
  name: 'Propofol 10mg/ml 20ml',
  unit: 'ampola',
  price: 19.9,
  balance: 3,
};

describe('isSearchable', () => {
  it.each([
    ['', false],
    ['p', false],
    [' p ', false],
    ['pr', true],
    ['propofol', true],
    ['  pr  ', true],
  ])('%j → %s', (term, expected) => {
    expect(isSearchable(term)).toBe(expected);
  });
});

describe('toSupplyOption', () => {
  it('reads price and balance out of the strings the API returns', () => {
    const option = toSupplyOption(
      {
        id: 'a',
        name: 'Isoflurano',
        currentQuantity: '2.5',
        defaultUnitCost: '280',
      },
      'frasco',
    );

    expect(option).toEqual({
      id: 'a',
      name: 'Isoflurano',
      unit: 'frasco',
      price: 280,
      balance: 2.5,
    });
  });

  it('falls back to zero for an item with no cost registered', () => {
    const option = toSupplyOption(
      {
        id: 'a',
        name: 'Sem custo',
        currentQuantity: '1',
        defaultUnitCost: null,
      },
      'un',
    );

    expect(option.price).toBe(0);
  });

  it.each([['0'], ['-4'], ['']])(
    'keeps a usable number for currentQuantity %j',
    currentQuantity => {
      const option = toSupplyOption(
        { id: 'a', name: 'Item', currentQuantity, defaultUnitCost: '1' },
        'un',
      );

      expect(Number.isFinite(option.balance)).toBe(true);
    },
  );

  it('reads a negative balance as-is, since stock may go below zero', () => {
    const option = toSupplyOption(
      {
        id: 'a',
        name: 'Item',
        currentQuantity: '-4',
        defaultUnitCost: '1',
      },
      'un',
    );

    expect(option.balance).toBe(-4);
  });
});

describe('formatSupplyPrice', () => {
  it.each([
    [19.9, 'R$ 19.90'],
    [280, 'R$ 280.00'],
    [0, 'R$ 0.00'],
    [1.5, 'R$ 1.50'],
    // 1.555 não é exato em binário e cai logo abaixo, então toFixed arredonda
    // para baixo. O MaterialCard formata do mesmo jeito: o preço bate entre as
    // duas telas, que é o que importa aqui.
    [1.555, 'R$ 1.55'],
  ])('%s → %j', (price, expected) => {
    expect(formatSupplyPrice(price)).toBe(expected);
  });
});

describe('sanitizeQuantityInput', () => {
  it.each([
    ['12', '12'],
    ['1,5', '1.5'],
    ['1.5', '1.5'],
    ['abc', ''],
    ['1a2', '12'],
    ['-3', '3'],
    // Um único separador: o segundo é descartado em vez de invalidar o campo.
    ['1,5,7', '1.57'],
    ['1.5.7', '1.57'],
    ['', ''],
    [',5', '.5'],
  ])('%j → %j', (input, expected) => {
    expect(sanitizeQuantityInput(input)).toBe(expected);
  });
});

describe('parseQuantity', () => {
  it.each([
    ['1', 1],
    ['1,5', 1.5],
    ['0', 0],
    ['', 0],
    ['abc', 0],
    ['.5', 0.5],
  ])('%j → %s', (input, expected) => {
    expect(parseQuantity(input)).toBe(expected);
  });
});

describe('exceedsBalance', () => {
  it.each([
    [2, 3, false],
    // A igualdade não avisa: usar o saldo inteiro é uso normal.
    [3, 3, false],
    [4, 3, true],
    [0.5, 0, true],
    [1, 0, true],
    [1, -2, true],
  ])('quantity %s vs balance %s → %s', (quantity, balance, expected) => {
    expect(exceedsBalance(quantity, balance)).toBe(expected);
  });
});

describe('canConfirm', () => {
  it.each([
    [null, '1', false],
    [OPTION, '', false],
    [OPTION, '0', false],
    [OPTION, 'abc', false],
    [OPTION, '1', true],
    [OPTION, '0,5', true],
    // Acima do saldo confirma do mesmo jeito: o aviso não bloqueia.
    [OPTION, '99', true],
  ])('option %#, quantity %j → %s', (option, quantity, expected) => {
    expect(canConfirm(option, quantity)).toBe(expected);
  });
});

describe('toSupplySelection', () => {
  it('carries the balance at the moment of the choice', () => {
    expect(toSupplySelection(OPTION, '1,5')).toEqual({
      itemId: 'item-1',
      name: 'Propofol 10mg/ml 20ml',
      unit: 'ampola',
      quantity: 1.5,
      balance: 3,
    });
  });
});
