import { useCallback, useMemo, useState } from 'react';

import { useAuth } from 'features/auth';
import { useVehicles, type Vehicle } from 'features/vehicles';
import { isNetworkError } from 'shared/utils/network';

import { useTrips } from './useTrips';
import { calculateTripCost } from '../domain/calculateTripCost';
import type { Trip, TripMode } from '../domain/trip.types';
import {
  MAX_DISTANCE_KM,
  MAX_RIDE_COST,
  parseDecimalInput,
} from '../domain/validateTripForm';
import {
  newTripClientGeneratedId,
  queueTripCreate,
  queueTripDelete,
} from '../services/offlineTripStore';
import { tripService } from '../services/tripService';

export type AppointmentTripErrorCode =
  | 'originRequired'
  | 'destinationRequired'
  | 'vehicleRequired'
  | 'distanceInvalid'
  | 'costInvalid'
  | 'saveFailed'
  | 'deleteFailed';

export type UseAppointmentTripsOptions = {
  appointmentId: string | null;
  clientId: string | null;
  occurredOn: string | null;
  defaultOrigin: string;
  defaultDestination: string;
};

export type AppointmentTripsState = {
  trips: Trip[];
  vehicles: Vehicle[];
  hasNoVehicles: boolean;
  expanded: boolean;
  mode: TripMode;
  origin: string;
  destination: string;
  selectedVehicleId: string;
  distanceKm: string;
  cost: string;
  previewCost: number;
  submitting: boolean;
  error: AppointmentTripErrorCode | null;
  tripToDelete: Trip | null;
  toggleExpanded: () => void;
  setMode: (mode: TripMode) => void;
  setOrigin: (value: string) => void;
  setDestination: (value: string) => void;
  setSelectedVehicleId: (id: string) => void;
  setDistanceKm: (value: string) => void;
  setCost: (value: string) => void;
  confirm: () => Promise<void>;
  askToDelete: (trip: Trip | null) => void;
  confirmDelete: () => Promise<void>;
};

const APPOINTMENT_TRIPS_PAGE_SIZE = 100;

export function useAppointmentTrips({
  appointmentId,
  clientId,
  occurredOn,
  defaultOrigin,
  defaultDestination,
}: UseAppointmentTripsOptions): AppointmentTripsState {
  const { session, account } = useAuth();
  const token = session?.idToken ?? '';
  const userId = account?.id ?? 'anonymous';

  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<TripMode>('OWN_VEHICLE');
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState(defaultDestination);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [cost, setCost] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<AppointmentTripErrorCode | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

  const { vehicles, isLoading: isLoadingVehicles } = useVehicles({
    token,
    autoFetch: true,
  });

  const { trips, refetch } = useTrips({
    from: occurredOn ?? undefined,
    to: occurredOn ?? undefined,
    appointmentId: appointmentId ?? undefined,
    pageSize: APPOINTMENT_TRIPS_PAGE_SIZE,
    autoFetch: Boolean(appointmentId && occurredOn),
  });

  const selectedVehicle = useMemo(
    () => vehicles.find(v => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  );

  const previewCost = useMemo(
    () =>
      calculateTripCost({
        mode,
        distanceKm,
        costPerKm: selectedVehicle?.costPerKm,
        cost,
      }),
    [mode, distanceKm, selectedVehicle?.costPerKm, cost],
  );

  const resetForm = useCallback(() => {
    setExpanded(false);
    setMode('OWN_VEHICLE');
    setOrigin(defaultOrigin);
    setDestination(defaultDestination);
    setSelectedVehicleId('');
    setDistanceKm('');
    setCost('');
    setError(null);
  }, [defaultOrigin, defaultDestination]);

  const toggleExpanded = useCallback(() => {
    resetForm();
    if (!expanded) setExpanded(true);
  }, [expanded, resetForm]);

  const validate = (): AppointmentTripErrorCode | null => {
    if (!origin.trim()) return 'originRequired';
    if (!destination.trim()) return 'destinationRequired';
    if (mode === 'OWN_VEHICLE') {
      if (!selectedVehicleId) return 'vehicleRequired';
      const distance = parseDecimalInput(distanceKm, 2);
      if (distance === null || distance <= 0 || distance > MAX_DISTANCE_KM) {
        return 'distanceInvalid';
      }
      return null;
    }
    const fare = parseDecimalInput(cost, 2);
    if (fare === null || fare <= 0 || fare > MAX_RIDE_COST) {
      return 'costInvalid';
    }
    if (distanceKm.trim()) {
      const distance = parseDecimalInput(distanceKm, 2);
      if (distance === null || distance <= 0 || distance > MAX_DISTANCE_KM) {
        return 'distanceInvalid';
      }
    }
    return null;
  };

  const confirm = async () => {
    const validationError = validate();
    setError(validationError);
    if (validationError || !occurredOn) return;

    setSubmitting(true);
    try {
      const dto = {
        mode,
        occurredOn,
        origin: origin.trim(),
        destination: destination.trim(),
        appointmentId,
        clientId,
        vehicleId: mode === 'OWN_VEHICLE' ? selectedVehicleId : null,
        distanceKm:
          distanceKm.trim() !== '' ? parseDecimalInput(distanceKm, 2) : null,
        cost: mode === 'RIDE' ? parseDecimalInput(cost, 2) : undefined,
      };

      let saved = false;
      if (token) {
        try {
          await tripService.create(token, dto);
          saved = true;
        } catch (apiErr) {
          if (!isNetworkError(apiErr)) {
            throw apiErr;
          }
        }
      }
      if (!saved) {
        await queueTripCreate(
          userId,
          newTripClientGeneratedId(),
          dto,
          previewCost,
        );
      }
      resetForm();
      await refetch();
    } catch {
      setError('saveFailed');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!tripToDelete) return;
    try {
      let removed = false;
      if (token && !tripToDelete.id.startsWith('local:')) {
        try {
          await tripService.remove(token, tripToDelete.id);
          removed = true;
        } catch (apiErr) {
          if (!isNetworkError(apiErr)) {
            throw apiErr;
          }
        }
      }
      if (!removed) {
        await queueTripDelete(userId, tripToDelete.id);
      }
      await refetch();
    } catch {
      setError('deleteFailed');
    } finally {
      setTripToDelete(null);
    }
  };

  return {
    trips,
    vehicles,
    hasNoVehicles: !isLoadingVehicles && vehicles.length === 0,
    expanded,
    mode,
    origin,
    destination,
    selectedVehicleId,
    distanceKm,
    cost,
    previewCost,
    submitting,
    error,
    tripToDelete,
    toggleExpanded,
    setMode,
    setOrigin,
    setDestination,
    setSelectedVehicleId,
    setDistanceKm,
    setCost,
    confirm,
    askToDelete: setTripToDelete,
    confirmDelete,
  };
}
