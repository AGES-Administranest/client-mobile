import type { ExpiringLot } from 'features/inventory/domain/expiryAlert';
import {
  inventoryAlertState,
  inventorySummary,
  type InventoryDisplayItem,
} from 'features/inventory/domain/inventoryOverview';

const NOW = new Date(2026, 8, 13, 10);
const item = (quantity: number): InventoryDisplayItem => ({
  id: 'propofol',
  name: 'Propofol',
  category: 'Medicamento',
  price: 42.9,
  unit: 'frasco',
  quantity,
  minimumStock: 5,
});
const lot = (
  id: string,
  expirationDate: ExpiringLot['expirationDate'],
): ExpiringLot => ({
  id,
  itemId: 'propofol',
  name: 'Propofol',
  expirationDate,
});

it('identifica um card com estoque e validade ao mesmo tempo', () => {
  expect(
    inventoryAlertState(
      item(2),
      [lot('a', '2026-09-15'), lot('b', '2027-01-01')],
      NOW,
    ),
  ).toEqual({
    lowStock: true,
    expiringLots: [expect.objectContaining({ id: 'a' })],
  });
});

it('resume itens abaixo do mínimo e lotes próximos separadamente', () => {
  expect(
    inventorySummary(
      [item(2), { ...item(10), id: 'cetamina', name: 'Cetamina' }],
      [lot('a', '2026-09-15'), lot('b', '2026-09-18')],
      NOW,
    ),
  ).toEqual({ lowStockCount: 1, expiringLotCount: 2 });
});
