import { formatConsumption, formatCostPerKm } from './formatCostPerKm';

describe('formatCostPerKm', () => {
  it('formats 4-decimal cost string rounding to cents', () => {
    expect(formatCostPerKm('0.4719')).toBe('R$ 0,47/km');
    expect(formatCostPerKm('1.0000')).toBe('R$ 1,00/km');
    expect(formatCostPerKm('8.00')).toBe('R$ 8,00/km');
    expect(formatCostPerKm('0.6290')).toBe('R$ 0,63/km');
  });

  it('handles numeric input', () => {
    expect(formatCostPerKm(0.4719)).toBe('R$ 0,47/km');
    expect(formatCostPerKm(1)).toBe('R$ 1,00/km');
  });

  it('returns R$ 0,00/km for empty, null or undefined input', () => {
    expect(formatCostPerKm('')).toBe('R$ 0,00/km');
    expect(formatCostPerKm(null)).toBe('R$ 0,00/km');
    expect(formatCostPerKm(undefined)).toBe('R$ 0,00/km');
    expect(formatCostPerKm('invalid')).toBe('R$ 0,00/km');
  });
});

describe('formatConsumption', () => {
  it('formats avg consumption with km/L', () => {
    expect(formatConsumption('12.5')).toBe('12,5 km/L');
    expect(formatConsumption(14)).toBe('14 km/L');
  });

  it('returns empty string for null, undefined or empty input', () => {
    expect(formatConsumption('')).toBe('');
    expect(formatConsumption(null)).toBe('');
    expect(formatConsumption(undefined)).toBe('');
    expect(formatConsumption('invalid')).toBe('');
  });
});
