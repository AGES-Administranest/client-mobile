import {
  ALL_CATEGORIES,
  filterMaterials,
  getCategoriesForSegment,
  MaterialItem,
} from '../../../../features/materials/domain/materialsFilter';

const ITEMS: MaterialItem[] = [
  {
    id: '1',
    segment: 'supplies',
    name: 'Propofol 10mg/ml 20ml',
    category: 'Medicamento',
    price: 19.9,
    unit: 'ampola',
    quantity: 8,
    minQuantity: 10,
    belowMinimum: false,
  },
  {
    id: '2',
    segment: 'supplies',
    name: 'Isoflurano 250ml',
    category: 'Anestésico',
    price: 280,
    unit: 'frasco',
    quantity: 2,
    minQuantity: 3,
    belowMinimum: true,
  },
  {
    id: '3',
    segment: 'supplies',
    name: 'Seringa 60ml',
    category: 'Descartavel',
    price: 2.8,
    unit: 'unidade',
    quantity: 45,
    minQuantity: 20,
    belowMinimum: false,
  },
  {
    id: '4',
    segment: 'equipment',
    name: 'Bisturi elétrico',
    category: 'Equipamento',
    price: 450,
    unit: 'unidade',
    quantity: 3,
    minQuantity: 1,
    belowMinimum: false,
  },
];

describe('getCategoriesForSegment', () => {
  it.each([
    ['supplies', ['Medicamento', 'Anestésico', 'Descartavel']],
    ['equipment', ['Equipamento']],
  ] as const)('segment %s -> %j', (segment, expected) => {
    expect(getCategoriesForSegment(ITEMS, segment)).toEqual(expected);
  });
});

describe('filterMaterials', () => {
  it('returns every item in the segment when category is ALL_CATEGORIES', () => {
    expect(filterMaterials(ITEMS, 'supplies', ALL_CATEGORIES)).toEqual([
      ITEMS[0],
      ITEMS[1],
      ITEMS[2],
    ]);
  });

  it('returns only items matching both segment and category', () => {
    expect(filterMaterials(ITEMS, 'supplies', 'Anestésico')).toEqual([
      ITEMS[1],
    ]);
  });

  it('excludes items from a different segment even if the category matches', () => {
    expect(filterMaterials(ITEMS, 'equipment', 'Medicamento')).toEqual([]);
  });

  it('returns an empty list when no item matches the category', () => {
    expect(filterMaterials(ITEMS, 'supplies', 'Vacina')).toEqual([]);
  });
});
