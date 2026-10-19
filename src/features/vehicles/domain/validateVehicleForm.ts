import type { FuelType } from './vehicle.types';

export const BRAND_MAX_LENGTH = 60;
export const MODEL_MAX_LENGTH = 120;
export const MAX_AVG_CONSUMPTION_KM_L = 100;
export const MAX_FUEL_PRICE = 100;
// Same precision the API accepts (backend `@IsNumber({ maxDecimalPlaces })`).
export const AVG_CONSUMPTION_DECIMAL_PLACES = 2;
export const FUEL_PRICE_DECIMAL_PLACES = 3;

/**
 * Parses "12,5" or "12.5" into a number. Anything that is not a plain decimal
 * ("12abc", "1.2.3", "-3") gives null, so it is never sent half-read.
 */
export function parseDecimalInput(
  raw: string | null | undefined,
  maxDecimalPlaces: number,
): number | null {
  const value = raw?.trim().replace(',', '.') ?? '';
  const match = /^\d+(?:\.(\d+))?$/.exec(value);
  if (!match) return null;
  if ((match[1]?.length ?? 0) > maxDecimalPlaces) return null;
  return Number(value);
}

export const FUEL_TYPES: readonly FuelType[] = [
  'GASOLINE',
  'ETHANOL',
  'DIESEL',
  'FLEX',
] as const;

export type VehicleFormValues = {
  brand: string;
  model: string;
  fuelType: FuelType;
  avgConsumptionKmL: string;
  fuelPrice: string;
};

export type VehicleFormErrorCode =
  | 'brandRequired'
  | 'brandMaxLength'
  | 'modelRequired'
  | 'modelMaxLength'
  | 'fuelTypeInvalid'
  | 'avgConsumptionRequired'
  | 'avgConsumptionInvalid'
  | 'fuelPriceRequired'
  | 'fuelPriceInvalid';

export type VehicleFormErrors = Partial<
  Record<keyof VehicleFormValues, VehicleFormErrorCode>
>;

export const EMPTY_VEHICLE_FORM: VehicleFormValues = {
  brand: '',
  model: '',
  fuelType: 'FLEX',
  avgConsumptionKmL: '',
  fuelPrice: '',
};

export function validateVehicleForm(
  values: VehicleFormValues,
): VehicleFormErrors {
  const errors: VehicleFormErrors = {};

  const brand = values.brand?.trim() ?? '';
  if (!brand) {
    errors.brand = 'brandRequired';
  } else if (brand.length > BRAND_MAX_LENGTH) {
    errors.brand = 'brandMaxLength';
  }

  const model = values.model?.trim() ?? '';
  if (!model) {
    errors.model = 'modelRequired';
  } else if (model.length > MODEL_MAX_LENGTH) {
    errors.model = 'modelMaxLength';
  }

  if (!FUEL_TYPES.includes(values.fuelType)) {
    errors.fuelType = 'fuelTypeInvalid';
  }

  if (!values.avgConsumptionKmL?.trim()) {
    errors.avgConsumptionKmL = 'avgConsumptionRequired';
  } else {
    const consumption = parseDecimalInput(
      values.avgConsumptionKmL,
      AVG_CONSUMPTION_DECIMAL_PLACES,
    );
    if (
      consumption === null ||
      consumption <= 0 ||
      consumption > MAX_AVG_CONSUMPTION_KM_L
    ) {
      errors.avgConsumptionKmL = 'avgConsumptionInvalid';
    }
  }

  if (!values.fuelPrice?.trim()) {
    errors.fuelPrice = 'fuelPriceRequired';
  } else {
    const price = parseDecimalInput(
      values.fuelPrice,
      FUEL_PRICE_DECIMAL_PLACES,
    );
    if (price === null || price <= 0 || price > MAX_FUEL_PRICE) {
      errors.fuelPrice = 'fuelPriceInvalid';
    }
  }

  return errors;
}

export function isVehicleFormValid(errors: VehicleFormErrors): boolean {
  return Object.keys(errors).length === 0;
}
