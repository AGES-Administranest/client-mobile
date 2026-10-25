import { toCalendarDate } from 'shared/utils/calendar';

import type { Trip } from './trip.types';
import { toDecimalInput } from './tripFormat';
import { EMPTY_TRIP_FORM, type TripFormValues } from './validateTripForm';

export type InitialTripValuesInput = {
  trip?: Trip | null;
  appointmentId?: string | null;
  clientId?: string | null;
  defaultOccurredOn?: string;
  defaultOrigin?: string;
  defaultDestination?: string;
};

export function buildInitialTripValues(
  input: InitialTripValuesInput,
  today: Date,
): TripFormValues {
  const { trip } = input;
  if (trip) {
    return {
      occurredOn: trip.occurredOn,
      origin: trip.origin,
      destination: trip.destination,
      mode: trip.mode,
      vehicleId: trip.vehicleId ?? '',
      distanceKm: toDecimalInput(trip.distanceKm),
      cost: trip.mode === 'RIDE' ? toDecimalInput(trip.cost) : '',
      clientId: trip.clientId ?? null,
      appointmentId: trip.appointmentId ?? null,
    };
  }
  return {
    ...EMPTY_TRIP_FORM,
    occurredOn: input.defaultOccurredOn ?? toCalendarDate(today),
    origin: input.defaultOrigin ?? '',
    destination: input.defaultDestination ?? '',
    clientId: input.clientId ?? null,
    appointmentId: input.appointmentId ?? null,
  };
}
