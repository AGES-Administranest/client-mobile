import { MaterialItem } from '../domain/materialsFilter';

const MOCK_MATERIALS: MaterialItem[] = [
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
    name: 'Midazolam 5mg/ml 3ml',
    category: 'Medicamento',
    price: 4.5,
    unit: 'ampola',
    quantity: 24,
    minQuantity: 10,
    belowMinimum: false,
  },
  {
    id: '4',
    segment: 'supplies',
    name: 'Fentanil 0,05mg/ml 10ml',
    category: 'Medicamento',
    price: 22,
    unit: 'ampola',
    quantity: 12,
    minQuantity: 8,
    belowMinimum: false,
  },
  {
    id: '5',
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
    id: '6',
    segment: 'equipment',
    name: 'Bisturi elétrico',
    category: 'Equipamento',
    price: 450,
    unit: 'unidade',
    quantity: 3,
    minQuantity: 1,
    belowMinimum: false,
  },
  {
    id: '7',
    segment: 'equipment',
    name: 'Monitor multiparamétrico',
    category: 'Equipamento',
    price: 3200,
    unit: 'unidade',
    quantity: 1,
    minQuantity: 2,
    belowMinimum: true,
  },
];

// Stand-in for a real API call — swap this for an HTTP client call once
// there's a backend endpoint for materials stock.
export async function fetchMaterials(): Promise<MaterialItem[]> {
  return Promise.resolve(MOCK_MATERIALS);
}
