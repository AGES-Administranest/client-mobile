import {
  InventoryOverview,
  type ExpiringLot,
  type InventoryDisplayItem,
} from 'features/inventory';

const REFERENCE_DATE = new Date(2026, 8, 13, 10);

const MOCK_ITEMS: InventoryDisplayItem[] = [
  {
    id: 'propofol',
    name: 'Propofol 10mg/ml 20ml',
    category: 'Medicamento',
    price: 19.9,
    unit: 'ampola',
    quantity: 8,
    minimumStock: 10,
  },
  {
    id: 'isoflurano',
    name: 'Isoflurano 100ml',
    category: 'Medicamento',
    price: 185,
    unit: 'frasco',
    quantity: 2,
    minimumStock: 3,
  },
  {
    id: 'seringa',
    name: 'Seringa descartável 10ml',
    category: 'Insumo',
    price: 1.8,
    unit: 'unidade',
    quantity: 68,
    minimumStock: 25,
  },
  {
    id: 'cateter',
    name: 'Cateter intravenoso 22G',
    category: 'Insumo',
    price: 4.5,
    unit: 'unidade',
    quantity: 10,
    minimumStock: 10,
  },
];

const MOCK_LOTS: ExpiringLot[] = [
  {
    id: 'propofol-lote-a',
    itemId: 'propofol',
    name: 'Propofol 10mg/ml 20ml',
    expirationDate: '2026-09-16',
  },
  {
    id: 'seringa-lote-a',
    itemId: 'seringa',
    name: 'Seringa descartável 10ml',
    expirationDate: '2026-09-19',
  },
];

export function MaterialsScreen() {
  return (
    <InventoryOverview
      items={MOCK_ITEMS}
      lots={MOCK_LOTS}
      referenceDate={REFERENCE_DATE}
    />
  );
}
