export type MaterialSegment = 'supplies' | 'equipment';

export const ALL_CATEGORIES = 'all' as const;

export type MaterialItem = {
  id: string;
  segment: MaterialSegment;
  name: string;
  category: string;
  price: number;
  unit: string;
  quantity: number;
  minQuantity: number;
  belowMinimum: boolean;
};

export function getCategoriesForSegment(
  items: MaterialItem[],
  segment: MaterialSegment,
): string[] {
  const categories = items
    .filter(item => item.segment === segment)
    .map(item => item.category);

  return Array.from(new Set(categories));
}

export function filterMaterials(
  items: MaterialItem[],
  segment: MaterialSegment,
  category: string,
): MaterialItem[] {
  return items.filter(
    item =>
      item.segment === segment &&
      (category === ALL_CATEGORIES || item.category === category),
  );
}
