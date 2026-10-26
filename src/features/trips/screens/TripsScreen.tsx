import { useEffect, useMemo, useState } from 'react';

import { SlideInModal } from 'app/components/ui/slide-in-modal';
import { useClientNames } from 'features/clients';
import { useVehicles } from 'features/vehicles';
import { useTranslation } from 'shared/i18n';
import { addMonths, toCalendarDate } from 'shared/utils/calendar';
import { formatCurrency } from 'shared/utils/currency';

import { TripFormSheet } from './TripFormSheet';
import { useTripRowTexts } from './useTripRowTexts';
import {
  TripsScreenPresentation,
  type TripRowGroup,
} from '../components/TripsScreenPresentation';
import type { Trip } from '../domain/trip.types';
import { toNumber } from '../domain/tripFormat';
import { useTrips } from '../hooks/useTrips';

export type TripsScreenProps = {
  visible: boolean;
  onClose: () => void;
  onTripsChanged?: () => void;
};

function currentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

export function TripsScreen({
  visible,
  onClose,
  onTripsChanged,
}: TripsScreenProps) {
  const { t, locale } = useTranslation();
  const [month, setMonth] = useState(currentMonth);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  useEffect(() => {
    if (visible) setMonth(currentMonth());
  }, [visible]);

  const period = useMemo(() => {
    const { year, monthIndex } = month;
    const today = new Date();
    const isCurrentMonth =
      today.getFullYear() === year && today.getMonth() === monthIndex;
    const first = new Date(year, monthIndex, 1);
    const monthName = new Intl.DateTimeFormat(locale, { month: 'long' }).format(
      first,
    );
    return {
      from: toCalendarDate(first),
      to: toCalendarDate(new Date(year, monthIndex + 1, 0)),
      isCurrentMonth,
      label: `${monthName.charAt(0).toUpperCase()}${monthName.slice(
        1,
      )} ${year}`,
      defaultOccurredOn: isCurrentMonth
        ? toCalendarDate(today)
        : toCalendarDate(first),
    };
  }, [month, locale]);

  const { vehicles } = useVehicles({ autoFetch: visible });
  const clientNamesById = useClientNames();
  const vehicleNamesById = useMemo(
    () =>
      Object.fromEntries(
        vehicles.map(vehicle => [
          vehicle.id,
          `${vehicle.brand} ${vehicle.model}`,
        ]),
      ),
    [vehicles],
  );
  const rowTexts = useTripRowTexts({ vehicleNamesById, clientNamesById });

  const trips = useTrips({
    from: period.from,
    to: period.to,
    autoFetch: visible,
    locale,
  });

  const groups: TripRowGroup[] = trips.groupedTrips.map(group => ({
    date: group.date,
    label: group.formattedDate,
    rows: group.trips.map(trip => ({ trip, texts: rowTexts(trip) })),
  }));

  const handleChanged = () => {
    trips.refetch().catch(() => undefined);
    onTripsChanged?.();
  };

  return (
    <SlideInModal visible={visible} onRequestClose={onClose}>
      <TripsScreenPresentation
        texts={{
          title: t('trips.title'),
          subtitle: t('trips.subtitle'),
          back: t('trips.back'),
          add: t('trips.add'),
          emptyTitle: t('trips.empty.title'),
          emptyMessage: t('trips.empty.message'),
          summary: {
            monthLabel: period.label,
            currentMonth: t('trips.summary.currentMonth'),
            previousMonth: t('trips.summary.previousMonth'),
            nextMonth: t('trips.summary.nextMonth'),
            costInMonth: t('trips.summary.costInMonth'),
            kmDriven: t('trips.summary.kmDriven'),
            tripsCount: t('trips.summary.tripsCount'),
            totalCost: formatCurrency(toNumber(trips.totalCost), locale, {
              showCents: true,
            }),
            totalKm: `${toNumber(trips.totalKm).toLocaleString(locale, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })} km`,
            count: String(trips.total),
          },
        }}
        isCurrentMonth={period.isCurrentMonth}
        onPreviousMonth={() =>
          setMonth(current => addMonths(current.year, current.monthIndex, -1))
        }
        onNextMonth={() =>
          setMonth(current => addMonths(current.year, current.monthIndex, 1))
        }
        groups={groups}
        isLoading={trips.isLoading}
        isLoadingMore={trips.isLoadingMore}
        hasMore={trips.hasMore}
        onLoadMore={trips.loadMore}
        onRefresh={() => {
          trips.refetch().catch(() => undefined);
        }}
        onTripPress={trip => {
          setSelectedTrip(trip);
          setSheetVisible(true);
        }}
        onAddTrip={() => {
          setSelectedTrip(null);
          setSheetVisible(true);
        }}
        onBack={onClose}
      />

      <TripFormSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        trip={selectedTrip}
        clientName={
          selectedTrip?.clientId
            ? clientNamesById[selectedTrip.clientId]
            : undefined
        }
        defaultOccurredOn={period.defaultOccurredOn}
        onSuccess={handleChanged}
        onDeleted={handleChanged}
      />
    </SlideInModal>
  );
}
