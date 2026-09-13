import {
  formatMovementDate,
  formatQuantity,
  formatSignedQuantity,
  formatSignedValue,
} from './formatMovement';
import type { StockMovement } from './stockMovement';

function movement(overrides: Partial<StockMovement> = {}): StockMovement {
  return {
    id: 'movement-1',
    itemName: 'Propofol 10mg/ml 20ml',
    unit: 'ampoule',
    type: 'outbound',
    source: 'appointment',
    quantity: 2,
    unitCost: 19.9,
    occurredAt: '2026-08-12T09:30:00',
    ...overrides,
  };
}

describe('formatSignedQuantity', () => {
  it('prefixes an inbound quantity with a plus sign', () => {
    const result = formatSignedQuantity(
      movement({ type: 'inbound', quantity: 30 }),
      'pt-BR',
    );

    expect(result).toBe('+30');
  });

  it('prefixes an outbound quantity with a minus sign', () => {
    const result = formatSignedQuantity(
      movement({ type: 'outbound', quantity: 2 }),
      'pt-BR',
    );

    expect(result).toBe('-2');
  });

  it('uses the locale decimal separator', () => {
    const decimal = movement({ type: 'inbound', quantity: 2.5 });

    expect(formatSignedQuantity(decimal, 'pt-BR')).toBe('+2,5');
    expect(formatSignedQuantity(decimal, 'en-US')).toBe('+2.5');
  });

  it('caps the fraction at the three decimals the schema stores', () => {
    const result = formatSignedQuantity(
      movement({ type: 'inbound', quantity: 1.23456 }),
      'en-US',
    );

    expect(result).toBe('+1.235');
  });
});

describe('formatSignedValue', () => {
  const normalize = (value: string) => value.replace(/\u00a0/g, ' ');

  it('shows an entrada as a positive amount in reais', () => {
    const result = formatSignedValue(
      movement({ type: 'inbound', quantity: 1, unitCost: 145 }),
      'pt-BR',
    );

    expect(normalize(result)).toBe('+R$ 145,00');
  });

  it('shows a saída as a negative amount', () => {
    const result = formatSignedValue(
      movement({ type: 'outbound', quantity: 2, unitCost: 19.9 }),
      'pt-BR',
    );

    expect(normalize(result)).toBe('-R$ 39,80');
  });

  it("keeps reais under another locale, formatted that locale's way", () => {
    const result = formatSignedValue(
      movement({ type: 'inbound', quantity: 1, unitCost: 1234.5 }),
      'en-US',
    );

    expect(normalize(result)).toBe('+R$1,234.50');
  });

  it('still shows the direction when the movement has no cost', () => {
    const result = formatSignedValue(
      movement({ type: 'outbound', quantity: 3, unitCost: 0 }),
      'pt-BR',
    );

    expect(normalize(result)).toBe('-R$ 0,00');
  });
});

describe('formatQuantity', () => {
  it('leaves the sign out — it sits under a value that already carries it', () => {
    expect(
      formatQuantity(movement({ type: 'outbound', quantity: 2 }), 'pt-BR'),
    ).toBe('2');
  });

  it('uses the locale decimal separator', () => {
    expect(formatQuantity(movement({ quantity: 1.5 }), 'pt-BR')).toBe('1,5');
    expect(formatQuantity(movement({ quantity: 1.5 }), 'en-US')).toBe('1.5');
  });
});

describe('formatMovementDate', () => {
  it('renders a compact day and month in pt-BR, without the "de" filler', () => {
    expect(formatMovementDate('2026-08-12T09:30:00', 'pt-BR')).toBe('12 ago');
  });

  it('keeps the month-first order of en-US', () => {
    expect(formatMovementDate('2026-08-12T09:30:00', 'en-US')).toBe('Aug 12');
  });

  it('pads the day to two digits', () => {
    expect(formatMovementDate('2026-09-01T09:30:00', 'pt-BR')).toBe('01 set');
  });
});
