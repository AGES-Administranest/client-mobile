import type { SupplyItem } from './supplyItem';

export type SavedSupply = {
  id: string;
  quantity: string;
  unitCost: string;
  item: { name: string };
};

// Quantidade e custo chegam como texto decimal (Prisma.Decimal); a lista
// trabalha com número.
export function toSupplyItem(saved: SavedSupply): SupplyItem {
  return {
    id: saved.id,
    name: saved.item.name,
    quantity: Number.parseFloat(saved.quantity),
    unitCost: Number.parseFloat(saved.unitCost),
  };
}

// Sem valor cobrado não há margem para mostrar: `null` esconde a linha.
export function grossMargin(
  amount: string | null,
  totalCost: number,
): number | null {
  if (amount === null) {
    return null;
  }
  const billed = Number.parseFloat(amount);
  return Number.isFinite(billed) ? billed - totalCost : null;
}
