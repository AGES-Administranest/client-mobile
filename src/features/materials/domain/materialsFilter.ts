export type BackendItemCategory =
  | 'MEDICATION'
  | 'ANESTHETIC'
  | 'DISPOSABLE'
  | 'OTHER';

export type BackendMeasurementUnit =
  | 'UNIT'
  | 'AMPOULE'
  | 'VIAL'
  | 'BOX'
  | 'ML'
  | 'MG'
  | 'GRAM'
  | 'TABLET'
  | 'OTHER';

export type BackendItem = {
  id: string;
  supplierId: string | null;
  category: BackendItemCategory;
  unit: BackendMeasurementUnit;
  name: string;
  defaultUnitCost: string | null;
  minimumStock: string | null;
  currentQuantity: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

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


const CATEGORY_LABEL: Record<BackendItemCategory, string> = {
  MEDICATION: 'Medicamento',
  ANESTHETIC: 'Anestésico',
  DISPOSABLE: 'Descartável',
  OTHER: 'Outro',
};

const UNIT_LABEL: Record<BackendMeasurementUnit, string> = {
  UNIT: 'un',
  AMPOULE: 'ampola',
  VIAL: 'frasco',
  BOX: 'caixa',
  ML: 'ml',
  MG: 'mg',
  GRAM: 'g',
  TABLET: 'comprimido',
  OTHER: 'un',
};


export const UNIT_OPTIONS: readonly string[] = Array.from(
  new Set(Object.values(UNIT_LABEL)),
);

/
export const CATEGORY_OPTIONS: readonly {
  value: BackendItemCategory;
  label: string;
}[] = [
  { value: 'MEDICATION', label: CATEGORY_LABEL.MEDICATION },
  { value: 'ANESTHETIC', label: CATEGORY_LABEL.ANESTHETIC },
  { value: 'DISPOSABLE', label: CATEGORY_LABEL.DISPOSABLE },
];

export function backendItemToMaterial(item: BackendItem): MaterialItem {
  const price = item.defaultUnitCost ? parseFloat(item.defaultUnitCost) : 0;
  const quantity = parseFloat(item.currentQuantity);
  const minQuantity = item.minimumStock ? parseFloat(item.minimumStock) : 0;

  return {
    id: item.id,
    segment: 'supplies',
    name: item.name,
    category: CATEGORY_LABEL[item.category] ?? item.category,
    price,
    unit: UNIT_LABEL[item.unit] ?? item.unit,
    quantity,
    minQuantity,
    belowMinimum: quantity < minQuantity,
  };
}


export function backendUnitLabel(unit: BackendMeasurementUnit): string {
  return UNIT_LABEL[unit] ?? unit;
}


export function toBackendUnit(unit: string): BackendMeasurementUnit {
  const normalized = unit.trim().toLowerCase();
  const map: Record<string, BackendMeasurementUnit> = {
    un: 'UNIT',
    unit: 'UNIT',
    unidade: 'UNIT',
    ampola: 'AMPOULE',
    ampolas: 'AMPOULE',
    ampoule: 'AMPOULE',
    ampoules: 'AMPOULE',
    frasco: 'VIAL',
    frascos: 'VIAL',
    vial: 'VIAL',
    vials: 'VIAL',
    caixa: 'BOX',
    caixas: 'BOX',
    box: 'BOX',
    boxes: 'BOX',
    ml: 'ML',
    mg: 'MG',
    g: 'GRAM',
    grama: 'GRAM',
    gramas: 'GRAM',
    gram: 'GRAM',
    grams: 'GRAM',
    comprimido: 'TABLET',
    comprimidos: 'TABLET',
    tablet: 'TABLET',
    tablets: 'TABLET',
  };
  return map[normalized] ?? 'OTHER';
}

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
