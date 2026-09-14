import { needsAttention } from './stockItem';

describe('needsAttention', () => {
  const item = {
    id: '1',
    name: 'PROPOFOL 10MG/ML',
    quantity: 5,
    unit: 'FA',
  };

  it('passes a well-formed item', () => {
    expect(needsAttention(item)).toBe(false);
  });

  it('flags a non-positive quantity', () => {
    expect(needsAttention({ ...item, quantity: 0 })).toBe(true);
  });

  it('flags an empty name', () => {
    expect(needsAttention({ ...item, name: '  ' })).toBe(true);
  });
});
