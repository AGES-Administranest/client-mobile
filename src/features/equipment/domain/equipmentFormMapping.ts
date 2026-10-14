import { formatCurrencyInput } from 'shared/utils/inputMasks';

import type {
  CreateEquipmentDto,
  Equipment,
  UpdateEquipmentDto,
} from './equipment.types';
import { DEFAULT_USEFUL_LIFE_MONTHS } from './previewDepreciation';
import type {
  EquipmentFormValues,
  NormalizedEquipmentForm,
} from './validateEquipmentForm';

const MONTHS_PER_YEAR = 12;

export const EMPTY_EQUIPMENT_FORM: EquipmentFormValues = {
  name: '',
  purchaseValue: '',
  acquisitionDate: '',
  usefulLifeYears: '',
  notes: '',
};

/**
 * Vida útil que o formulário não consegue mostrar: o back guarda meses, e só
 * múltiplos de 12 viram um número inteiro de anos sem arredondar.
 */
export function legacyUsefulLifeMonths(equipment: Equipment): number | null {
  return equipment.usefulLifeMonths % MONTHS_PER_YEAR === 0
    ? null
    : equipment.usefulLifeMonths;
}

export type UsefulLifeDisplay =
  | { unit: 'years'; value: number }
  | { unit: 'months'; value: number };

export function usefulLifeDisplay(months: number): UsefulLifeDisplay {
  return months % MONTHS_PER_YEAR === 0
    ? { unit: 'years', value: months / MONTHS_PER_YEAR }
    : { unit: 'months', value: months };
}

function isoToDateInput(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

export function equipmentToFormValues(
  equipment: Equipment,
): EquipmentFormValues {
  return {
    name: equipment.name,
    purchaseValue: formatCurrencyInput(
      String(Math.round(equipment.purchaseValue * 100)),
    ),
    acquisitionDate: isoToDateInput(equipment.acquisitionDate),
    usefulLifeYears:
      legacyUsefulLifeMonths(equipment) === null
        ? String(equipment.usefulLifeMonths / MONTHS_PER_YEAR)
        : '',
    notes: equipment.notes ?? '',
  };
}

export function buildCreateDto(
  form: NormalizedEquipmentForm,
): CreateEquipmentDto {
  return {
    name: form.name,
    purchaseValue: form.purchaseValue,
    acquisitionDate: form.acquisitionDate,
    usefulLifeMonths:
      form.usefulLifeYears === null
        ? DEFAULT_USEFUL_LIFE_MONTHS
        : form.usefulLifeYears * MONTHS_PER_YEAR,
    ...(form.notes !== '' ? { notes: form.notes } : {}),
  };
}

type UpdateContext = {
  /** Meses atuais quando não são múltiplo de 12; null caso contrário. */
  legacyMonths: number | null;
  /** O campo de vida útil continua igual ao que o formulário abriu. */
  usefulLifeUntouched: boolean;
};

/**
 * O PATCH do back mantém o valor antigo de um campo omitido, então só a vida
 * útil de um equipamento em meses quebrados, que ninguém mexeu, fica de fora.
 * Observações apagadas vão como null: omitir manteria o texto antigo.
 */
export function buildUpdateDto(
  form: NormalizedEquipmentForm,
  { legacyMonths, usefulLifeUntouched }: UpdateContext,
): UpdateEquipmentDto {
  const keepsLegacyMonths = legacyMonths !== null && usefulLifeUntouched;

  return {
    name: form.name,
    purchaseValue: form.purchaseValue,
    acquisitionDate: form.acquisitionDate,
    ...(keepsLegacyMonths
      ? {}
      : {
          usefulLifeMonths:
            form.usefulLifeYears === null
              ? DEFAULT_USEFUL_LIFE_MONTHS
              : form.usefulLifeYears * MONTHS_PER_YEAR,
        }),
    notes: form.notes === '' ? null : form.notes,
  };
}
