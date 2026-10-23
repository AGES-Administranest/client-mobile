import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from 'react-native';

import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { useAuth } from 'features/auth';
import { useClientNames } from 'features/clients';
import { useVehicles } from 'features/vehicles';
import { useTranslation } from 'shared/i18n';
import { addMonths } from 'shared/utils/calendar';
import { isNetworkError } from 'shared/utils/network';

import { TripFormSheet } from '../components/TripFormSheet';
import { TripsScreenPresentation } from '../components/TripsScreenPresentation';
import type { Trip } from '../domain/trip.types';
import { useTrips } from '../hooks/useTrips';
import { queueTripDelete } from '../services/offlineTripStore';
import { tripService } from '../services/tripService';

export type TripsScreenProps = {
  visible?: boolean;
  onClose?: () => void;
};

export function TripsScreen({
  visible = true,
  onClose = () => {},
}: TripsScreenProps) {
  const { locale } = useTranslation();

  const [dateState, setDateState] = useState(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      monthIndex: now.getMonth(),
    };
  });

  useEffect(() => {
    if (visible) {
      const now = new Date();
      setDateState({
        year: now.getFullYear(),
        monthIndex: now.getMonth(),
      });
    }
  }, [visible]);

  const { from, to, monthLabel, isCurrentMonth, defaultOccurredOn } = useMemo(() => {
    const { year, monthIndex } = dateState;
    const now = new Date();
    const isCurrent =
      now.getFullYear() === year && now.getMonth() === monthIndex;

    const monthStr = String(monthIndex + 1).padStart(2, '0');
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const lastDayStr = String(lastDay).padStart(2, '0');

    const fromDate = `${year}-${monthStr}-01`;
    const toDate = `${year}-${monthStr}-${lastDayStr}`;

    const monthName = new Intl.DateTimeFormat(locale, { month: 'long' }).format(
      new Date(year, monthIndex, 1),
    );
    const capitalizedMonth =
      monthName.charAt(0).toUpperCase() + monthName.slice(1).toLowerCase();
    const label = `${capitalizedMonth} ${year}`;

    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const initialDate = isCurrent ? todayIso : fromDate;

    return {
      from: fromDate,
      to: toDate,
      monthLabel: label,
      isCurrentMonth: isCurrent,
      defaultOccurredOn: initialDate,
    };
  }, [dateState, locale]);

  let sessionToken: string | undefined;
  let userId = 'anonymous';
  try {
    const auth = useAuth();
    sessionToken = auth.session?.idToken;
    userId = auth.account?.id ?? 'anonymous';
  } catch {
    sessionToken = undefined;
  }
  const token = sessionToken ?? '';

  const { vehicles } = useVehicles({ token, autoFetch: visible });
  const clientNames = useClientNames();

  const vehicleNamesById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of vehicles) {
      map[v.id] = `${v.brand} ${v.model}`;
    }
    return map;
  }, [vehicles]);

  const {
    trips,
    groupedTrips,
    totalKm,
    totalCost,
    isLoading,
    isLoadingMore,
    hasMore,
    refetch,
    loadMore,
  } = useTrips({
    from,
    to,
    token,
    autoFetch: visible,
    locale,
  });

  // Sheet states
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

  const handlePreviousMonth = () => {
    setDateState(curr => addMonths(curr.year, curr.monthIndex, -1));
  };

  const handleNextMonth = () => {
    setDateState(curr => addMonths(curr.year, curr.monthIndex, 1));
  };

  const handleAddTrip = () => {
    setSelectedTrip(null);
    setSheetVisible(true);
  };

  const handleTripPress = (trip: Trip) => {
    setSelectedTrip(trip);
    setSheetVisible(true);
  };

  const handleDeleteTripConfirm = async () => {
    if (!tripToDelete) return;
    try {
      if (token && !tripToDelete.id.startsWith('local:')) {
        try {
          await tripService.remove(token, tripToDelete.id);
          setTripToDelete(null);
          refetch();
          return;
        } catch (apiErr) {
          if (!isNetworkError(apiErr)) {
            throw apiErr;
          }
        }
      }

      await queueTripDelete(userId, tripToDelete.id);
      setTripToDelete(null);
      refetch();
    } catch {
      setTripToDelete(null);
    }
  };

  const content = (
    <>
      <TripsScreenPresentation
        monthLabel={monthLabel}
        isCurrentMonth={isCurrentMonth}
        onPreviousMonth={handlePreviousMonth}
        onNextMonth={handleNextMonth}
        totalKm={totalKm}
        totalCost={totalCost}
        groupedTrips={groupedTrips}
        totalTripsCount={trips.length}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onRefresh={refetch}
        onTripPress={handleTripPress}
        onDeleteTrip={trip => setTripToDelete(trip)}
        onAddTrip={handleAddTrip}
        onBack={onClose}
        vehicleNamesById={vehicleNamesById}
        clientNamesById={clientNames}
      />

      <TripFormSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        trip={selectedTrip}
        defaultOccurredOn={defaultOccurredOn}
        onSuccess={() => refetch()}
        onDeleted={() => refetch()}
      />

      <ConfirmSheet
        visible={tripToDelete !== null}
        title="Excluir deslocamento"
        message="Deseja realmente excluir este deslocamento?"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleDeleteTripConfirm}
        onCancel={() => setTripToDelete(null)}
      />
    </>
  );

  // If controlled via visible prop (modal style, same as VehiclesScreen)
  if (visible !== undefined) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={onClose}
      >
        {content}
      </Modal>
    );
  }

  return content;
}
