// Contrato: AGES-Administranest/backend, branch
// feat/US-15-equipment-registration-and-depreciation-calculation (ainda não
// mergeada), módulo src/modules/equipment. O backend calcula depreciação, valor
// atual, percentual e fim de vida útil; o front só exibe.
export type Equipment = {
  id: string;
  supplierId: string | null;
  name: string;
  purchaseValue: number;
  salvageValue: number;
  acquisitionDate: string;
  usefulLifeMonths: number;
  notes: string | null;
  active: boolean;
  monthlyDepreciation: number;
  currentValue: number;
  usefulLifeUsedPct: number;
  endOfLife: boolean;
};

export type EquipmentSummary = {
  monthlyTotal: number;
  yearlyTotal: number;
  count: number;
};

export type CreateEquipmentDto = {
  name: string;
  purchaseValue: number;
  acquisitionDate: string;
  salvageValue?: number;
  usefulLifeMonths?: number;
  notes?: string;
  supplierId?: string | null;
};

export type UpdateEquipmentDto = Partial<
  Omit<CreateEquipmentDto, 'notes'> & { notes: string | null }
>;

export type EquipmentFormTarget =
  | { mode: 'create' }
  | { mode: 'edit'; equipment: Equipment };
