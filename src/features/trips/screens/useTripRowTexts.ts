import { useCallback } from 'react';

import { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

import type { TripListItemTexts } from '../components/TripListItem';
import type { Trip } from '../domain/trip.types';
import { toNumber } from '../domain/tripFormat';

export type TripRowNames = {
  vehicleNamesById: Record<string, string>;
  clientNamesById?: Record<string, string>;
};

export function useTripRowTexts({
  vehicleNamesById,
  clientNamesById = {},
}: TripRowNames): (trip: Trip) => TripListItemTexts {
  const { t, locale } = useTranslation();

  return useCallback(
    (trip: Trip) => {
      const distance =
        trip.distanceKm !== null && trip.distanceKm !== undefined
          ? `${toNumber(trip.distanceKm).toLocaleString(locale)} km`
          : null;
      const modeName =
        trip.mode === 'OWN_VEHICLE'
          ? (trip.vehicleId && vehicleNamesById[trip.vehicleId]) ??
            t('trips.item.ownVehicle')
          : t('trips.item.ride');

      return {
        subtitle: distance ? `${modeName} · ${distance}` : modeName,
        cost: formatCurrency(toNumber(trip.cost), locale, { showCents: true }),
        tag: trip.clientId ? clientNamesById[trip.clientId] : undefined,
        pending: t('trips.item.pending'),
        delete: t('trips.item.delete'),
      };
    },
    [t, locale, vehicleNamesById, clientNamesById],
  );
}
