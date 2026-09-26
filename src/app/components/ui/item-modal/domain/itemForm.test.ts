import {
  MAX_QUANTITY,
  MAX_UNIT_COST,
  validateItemForm,
  type ItemFormFlags,
  type ItemFormValues,
} from './itemForm';

const NEW_ITEM: ItemFormFlags = {
  isEditing: false,
  hasChosenItem: true,
  isAddingToExisting: false,
  showMinQuantity: true,
  showExpiration: true,
  showSupplier: true,
};

const EXISTING_ITEM: ItemFormFlags = {
  ...NEW_ITEM,
  isAddingToExisting: true,
  showMinQuantity: false,
  showExpiration: false,
  showSupplier: false,
};

const EDITING: ItemFormFlags = {
  ...NEW_ITEM,
  isEditing: true,
  showSupplier: false,
};

const VALID: ItemFormValues = {
  name: 'Propofol',
  unitCost: '39,80',
  unit: 'ampola',
  quantity: '10',
  minQuantity: '2',
  expiration: '31/12/2099',
  supplierName: 'Distribuidora Vet',
};

const values = (overrides: Partial<ItemFormValues> = {}): ItemFormValues => ({
  ...VALID,
  ...overrides,
});

describe('validateItemForm', () => {
  it('accepts a complete new item', () => {
    expect(validateItemForm(VALID, NEW_ITEM)).toEqual({});
  });

  it('accepts a new item with only the required fields', () => {
    expect(
      validateItemForm(
        values({
          quantity: '',
          minQuantity: '',
          expiration: '',
          supplierName: '',
        }),
        NEW_ITEM,
      ),
    ).toEqual({});
  });

  it.each([
    ['', 'required'],
    ['   ', 'required'],
    ['P', 'tooShort'],
    ['Pr', undefined],
  ])('checks the name %p', (name, error) => {
    expect(validateItemForm(values({ name }), NEW_ITEM).name).toBe(error);
  });

  it('asks to pick an item or add a new one before anything is chosen', () => {
    expect(
      validateItemForm(values(), { ...NEW_ITEM, hasChosenItem: false }).name,
    ).toBe('pickOrAdd');
  });

  it.each([
    ['', 'required'],
    ['0,00', undefined],
    ['1.234,50', undefined],
    [String(MAX_UNIT_COST).replace('.', ','), undefined],
    ['1.000.000,00', 'tooLarge'],
  ])('checks the unit cost %p', (unitCost, error) => {
    expect(validateItemForm(values({ unitCost }), NEW_ITEM).unitCost).toBe(
      error,
    );
  });

  it.each([
    ['', 'required'],
    ['  ', 'required'],
    ['ampola', undefined],
  ])('checks the unit %p', (unit, error) => {
    expect(validateItemForm(values({ unit }), NEW_ITEM).unit).toBe(error);
  });

  it.each([
    [NEW_ITEM, '', undefined],
    [NEW_ITEM, '0', undefined],
    [NEW_ITEM, String(MAX_QUANTITY), undefined],
    [NEW_ITEM, String(MAX_QUANTITY + 1), 'tooLarge'],
    [EXISTING_ITEM, '', 'required'],
    [EXISTING_ITEM, '0', 'zero'],
    [EXISTING_ITEM, '1', undefined],
    [EXISTING_ITEM, String(MAX_QUANTITY + 1), 'tooLarge'],
    [EDITING, '', undefined],
  ])('checks the quantity in %#: %p', (flags, quantity, error) => {
    expect(validateItemForm(values({ quantity }), flags).quantity).toBe(error);
  });

  it.each([
    ['', undefined],
    ['0', undefined],
    [String(MAX_QUANTITY + 1), 'tooLarge'],
  ])('checks the minimum quantity %p', (minQuantity, error) => {
    expect(
      validateItemForm(values({ minQuantity }), NEW_ITEM).minQuantity,
    ).toBe(error);
  });

  it.each([
    ['', undefined],
    ['31/12', 'incomplete'],
    ['31/02/2099', 'invalid'],
    ['00/01/2099', 'invalid'],
    ['31/12/2099', undefined],
    ['01/01/2000', 'past'],
  ])('checks the expiration %p', (expiration, error) => {
    expect(validateItemForm(values({ expiration }), NEW_ITEM).expiration).toBe(
      error,
    );
  });

  it.each([
    ['', undefined],
    ['D', 'tooShort'],
    ['Di', undefined],
  ])('checks the supplier %p', (supplierName, error) => {
    expect(
      validateItemForm(values({ supplierName }), NEW_ITEM).supplierName,
    ).toBe(error);
  });

  it('ignores fields the modal is not showing', () => {
    expect(
      validateItemForm(
        values({
          minQuantity: '9999999',
          expiration: '99/99',
          supplierName: 'D',
        }),
        {
          ...NEW_ITEM,
          showMinQuantity: false,
          showExpiration: false,
          showSupplier: false,
        },
      ),
    ).toEqual({});
  });

  it('reports every field that failed at once', () => {
    expect(
      validateItemForm(
        values({ name: '', unitCost: '', unit: '', quantity: '0' }),
        EXISTING_ITEM,
      ),
    ).toEqual({
      name: 'required',
      unitCost: 'required',
      unit: 'required',
      quantity: 'zero',
    });
  });
});
