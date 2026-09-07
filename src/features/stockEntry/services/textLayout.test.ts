import { groupIntoRows, toleranceFromHeights } from './textLayout';

describe('groupIntoRows', () => {
  it('orders rows top to bottom and cells left to right', () => {
    const runs = [
      { x: 600, y: 100, text: 'FA' },
      { x: 20, y: 200, text: 'second row' },
      { x: 120, y: 100, text: 'first row' },
    ];

    expect(groupIntoRows(runs, 5)).toEqual([
      ['first row', 'FA'],
      ['second row'],
    ]);
  });

  it('merges fragments whose baselines differ by less than the tolerance', () => {
    const runs = [
      { x: 10, y: 100, text: 'a' },
      { x: 50, y: 104, text: 'b' },
    ];

    expect(groupIntoRows(runs, 5)).toEqual([['a', 'b']]);
  });

  it('keeps neighbouring lines apart when they exceed the tolerance', () => {
    const runs = [
      { x: 10, y: 100, text: 'a' },
      { x: 50, y: 110, text: 'b' },
    ];

    expect(groupIntoRows(runs, 5)).toEqual([['a'], ['b']]);
  });

  it('returns nothing for no input', () => {
    expect(groupIntoRows([], 5)).toEqual([]);
  });
});

describe('toleranceFromHeights', () => {
  it('uses half the median line height', () => {
    expect(toleranceFromHeights([30, 30, 30])).toBe(15);
  });

  it('is not thrown off by one oversized line', () => {
    expect(toleranceFromHeights([30, 30, 300])).toBe(15);
  });

  it('ignores non-positive heights', () => {
    expect(toleranceFromHeights([0, 0, 40])).toBe(20);
  });

  it('falls back to zero when there is nothing to measure', () => {
    expect(toleranceFromHeights([])).toBe(0);
  });
});
