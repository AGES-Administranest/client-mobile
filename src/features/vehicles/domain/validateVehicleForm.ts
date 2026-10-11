import type { FuelType } from './vehicle.types';

export const BRAND_MAX_LENGTH = 60;
export const MODEL_MAX_LENGTH = 120;
export const MAX_AVG_CONSUMPTION_KM_L = 100;
export const MAX_FUEL_PRICE = 100;

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

  const rawConsumption =
    values.avgConsumptionKmL?.trim().replace(',', '.') ?? '';
  if (!rawConsumption) {
    errors.avgConsumptionKmL = 'avgConsumptionRequired';
  } else {
    const consumptionNum = parseFloat(rawConsumption);
    if (
      !Number.isFinite(consumptionNum) ||
      consumptionNum <= 0 ||
      consumptionNum > MAX_AVG_CONSUMPTION_KM_L
    ) {
      errors.avgConsumptionKmL = 'avgConsumptionInvalid';
    }
  }

  const rawFuelPrice = values.fuelPrice?.trim().replace(',', '.') ?? '';
  if (!rawFuelPrice) {
    errors.fuelPrice = 'fuelPriceRequired';
  } else {
    const priceNum = parseFloat(rawFuelPrice);
    if (
      !Number.isFinite(priceNum) ||
      priceNum <= 0 ||
      priceNum > MAX_FUEL_PRICE
    ) {
      errors.fuelPrice = 'fuelPriceInvalid';
    }
  }

  return errors;
}

export function isVehicleFormValid(errors: VehicleFormErrors): boolean {
  return Object.keys(errors).length === 0;
}
