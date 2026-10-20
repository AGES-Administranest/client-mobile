import type { TripMode } from './trip.types';

export const PLACE_MAX_LENGTH = 200;
export const MAX_DISTANCE_KM = 99999;
export const MAX_RIDE_COST = 999999;
export const DISTANCE_DECIMAL_PLACES = 2;
export const COST_DECIMAL_PLACES = 2;

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

export type TripFormValues = {
  occurredOn: string; // YYYY-MM-DD
  origin: string;
  destination: string;
  mode: TripMode;
  vehicleId: string;
  distanceKm: string;
  cost: string;
  clientId?: string | null;
  appointmentId?: string | null;
};

export type TripFormErrorCode =
  | 'occurredOnRequired'
  | 'occurredOnInvalid'
  | 'originRequired'
  | 'originMaxLength'
  | 'destinationRequired'
  | 'destinationMaxLength'
  | 'vehicleRequired'
  | 'distanceRequired'
  | 'distanceInvalid'
  | 'costRequired'
  | 'costInvalid';

export type TripFormErrors = Partial<
  Record<keyof TripFormValues, TripFormErrorCode>
> & {
  general?: string;
};

export const EMPTY_TRIP_FORM: TripFormValues = {
  occurredOn: new Date().toISOString().slice(0, 10),
  origin: '',
  destination: '',
  mode: 'OWN_VEHICLE',
  vehicleId: '',
  distanceKm: '',
  cost: '',
  clientId: null,
  appointmentId: null,
};

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function validateTripForm(values: TripFormValues): TripFormErrors {
  const errors: TripFormErrors = {};

  const occurredOn = values.occurredOn?.trim() ?? '';
  if (!occurredOn) {
    errors.occurredOn = 'occurredOnRequired';
  } else if (!ISO_DATE_REGEX.test(occurredOn)) {
    errors.occurredOn = 'occurredOnInvalid';
  }

  const origin = values.origin?.trim() ?? '';
  if (!origin) {
    errors.origin = 'originRequired';
  } else if (origin.length > PLACE_MAX_LENGTH) {
    errors.origin = 'originMaxLength';
  }

  const destination = values.destination?.trim() ?? '';
  if (!destination) {
    errors.destination = 'destinationRequired';
  } else if (destination.length > PLACE_MAX_LENGTH) {
    errors.destination = 'destinationMaxLength';
  }

  if (values.mode === 'OWN_VEHICLE') {
    if (!values.vehicleId?.trim()) {
      errors.vehicleId = 'vehicleRequired';
    }

    if (!values.distanceKm?.trim()) {
      errors.distanceKm = 'distanceRequired';
    } else {
      const distance = parseDecimalInput(
        values.distanceKm,
        DISTANCE_DECIMAL_PLACES,
      );
      if (distance === null || distance <= 0 || distance > MAX_DISTANCE_KM) {
        errors.distanceKm = 'distanceInvalid';
      }
    }
  } else if (values.mode === 'RIDE') {
    if (!values.cost?.trim()) {
      errors.cost = 'costRequired';
    } else {
      const cost = parseDecimalInput(values.cost, COST_DECIMAL_PLACES);
      if (cost === null || cost <= 0 || cost > MAX_RIDE_COST) {
        errors.cost = 'costInvalid';
      }
    }

    // distanceKm is optional for RIDE, but if filled, must be valid
    if (values.distanceKm?.trim()) {
      const distance = parseDecimalInput(
        values.distanceKm,
        DISTANCE_DECIMAL_PLACES,
      );
      if (distance === null || distance <= 0 || distance > MAX_DISTANCE_KM) {
        errors.distanceKm = 'distanceInvalid';
      }
    }
  }

  return errors;
}

export function isTripFormValid(errors: TripFormErrors): boolean {
  return Object.keys(errors).length === 0;
}
