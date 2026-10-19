import {
  toExpiringLots,
  toMonitoredItems,
  type InventoryItemSnapshot,
} from './monitoredInventory';

function item(
  overrides: Partial<InventoryItemSnapshot> = {},
): InventoryItemSnapshot {
  return {
    id: 'item-1',
    name: 'Dipirona 500mg',
    unit: 'AMPOULE',
    currentQuantity: '2',
    minimumStock: '10',
    nearestExpiration: null,
    ...overrides,
  };
}

const label = (unit: string) => (unit === 'AMPOULE' ? 'ampola' : unit);

describe('toMonitoredItems', () => {
  it('reads the quantities the backend sends as strings', () => {
    const [monitored] = toMonitoredItems([item()], label);

    expect(monitored.quantity).toBe(2);
    expect(monitored.minimumStock).toBe(10);
  });

  it('treats an item without a minimum as never below it', () => {
    const [monitored] = toMonitoredItems([item({ minimumStock: null })], label);

    expect(monitored.minimumStock).toBe(0);
  });

  it('translates the unit instead of showing the backend enum', () => {
    const [monitored] = toMonitoredItems([item()], label);

    expect(monitored.unit).toBe('ampola');
  });

  it('keeps a unit it does not know instead of blanking it', () => {
    const [monitored] = toMonitoredItems([item({ unit: 'PARSEC' })], label);

    expect(monitored.unit).toBe('PARSEC');
  });
});

describe('toExpiringLots', () => {
  it('ignores an item with no expiration on record', () => {
    expect(toExpiringLots([item()])).toEqual([]);
  });

  it('turns the nearest expiration into a lot the alert understands', () => {
    expect(toExpiringLots([item({ nearestExpiration: '2026-10-05' })])).toEqual(
      [
        {
          id: 'item-1',
          itemId: 'item-1',
          name: 'Dipirona 500mg',
          expirationDate: '2026-10-05',
        },
      ],
    );
  });

  it.each([['05/10/2026'], ['2026-02-31'], ['nope']])(
    'drops the unreadable expiration %p',
    nearestExpiration => {
      expect(toExpiringLots([item({ nearestExpiration })])).toEqual([]);
    },
  );
});
