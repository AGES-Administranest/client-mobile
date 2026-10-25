import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { useClientSearch } from 'features/clients';
import { useVehicles } from 'features/vehicles';
import { isNetworkError } from 'shared/utils/network';

import { calculateTripCost } from '../domain/calculateTripCost';
import { isLocalTripId } from '../domain/offlineTrips';
import type { Trip, TripMode } from '../domain/trip.types';
import { buildInitialTripValues } from '../domain/tripFormValues';
import {
  isTripFormValid,
  parseDecimalInput,
  validateTripForm,
  type TripFormErrors,
  type TripFormValues,
} from '../domain/validateTripForm';
import {
  newTripClientGeneratedId,
  pendingCreateToTrip,
  queueTripCreate,
  queueTripDelete,
  queueTripUpdate,
} from '../services/offlineTripStore';
import { tripService } from '../services/tripService';

export type UseTripFormOptions = {
  trip?: Trip | null;
  clientName?: string;
  appointmentId?: string | null;
  clientId?: string | null;
  defaultOccurredOn?: string;
  defaultOrigin?: string;
  defaultDestination?: string;
  active?: boolean;
  onSuccess?: (savedTrip: Trip) => void;
  onDeleted?: (tripId: string) => void;
};

export function useTripForm(options: UseTripFormOptions = {}) {
  const { trip, clientName, active = true, onSuccess, onDeleted } = options;

  const { session, account } = useAuth();
  const token = session?.idToken ?? '';
  const userId = account?.id ?? 'anonymous';

  const { vehicles, isLoading: isLoadingVehicles } = useVehicles({
    token,
    autoFetch: active,
  });

  const latestOptions = useRef(options);
  latestOptions.current = options;

  const [values, setValues] = useState<TripFormValues>(() =>
    buildInitialTripValues(options, new Date()),
  );
  const [errors, setErrors] = useState<TripFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [isClientSearchPaused, setIsClientSearchPaused] = useState(
    Boolean(values.clientId),
  );

  const clientSearch = useClientSearch({
    active,
    paused: isClientSearchPaused,
  });
  const setClientSearchTerm = clientSearch.onTermChange;
  const latestSetClientSearchTerm = useRef(setClientSearchTerm);
  latestSetClientSearchTerm.current = setClientSearchTerm;

  useEffect(() => {
    if (!active) return;
    const initial = buildInitialTripValues(latestOptions.current, new Date());
    setValues(initial);
    setErrors({});
    setIsClientSearchPaused(Boolean(initial.clientId));
    latestSetClientSearchTerm.current(initial.clientId ? clientName ?? '' : '');
  }, [active, trip, clientName]);

  const selectedVehicle = useMemo(
    () => vehicles.find(v => v.id === values.vehicleId) ?? null,
    [vehicles, values.vehicleId],
  );

  const previewCost = useMemo(
    () =>
      calculateTripCost({
        mode: values.mode,
        distanceKm: values.distanceKm,
        costPerKm: selectedVehicle?.costPerKm,
        cost: values.cost,
      }),
    [values.mode, values.distanceKm, selectedVehicle?.costPerKm, values.cost],
  );

  const setFieldValue = useCallback(
    <K extends keyof TripFormValues>(field: K, value: TripFormValues[K]) => {
      setValues(prev => ({ ...prev, [field]: value }));
      setErrors(prev => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    },
    [],
  );

  const setMode = useCallback((mode: TripMode) => {
    setValues(prev => ({ ...prev, mode }));
    setErrors(prev => {
      const next = { ...prev };
      delete next.vehicleId;
      delete next.distanceKm;
      delete next.cost;
      return next;
    });
  }, []);

  const onSelectClient = useCallback(
    (option: { id: string; name: string }) => {
      setValues(prev => ({ ...prev, clientId: option.id }));
      setClientSearchTerm(option.name);
      setIsClientSearchPaused(true);
    },
    [setClientSearchTerm],
  );

  const onClientSearchTermChange = useCallback(
    (term: string) => {
      setIsClientSearchPaused(false);
      setClientSearchTerm(term);
      if (!term.trim()) {
        setValues(prev => ({ ...prev, clientId: null }));
      }
    },
    [setClientSearchTerm],
  );

  const submit = useCallback(async (): Promise<Trip | null> => {
    const validationErrors = validateTripForm(values);
    setErrors(validationErrors);
    if (!isTripFormValid(validationErrors)) {
      return null;
    }

    setSubmitting(true);
    try {
      const dto = {
        mode: values.mode,
        occurredOn: values.occurredOn,
        origin: values.origin.trim(),
        destination: values.destination.trim(),
        clientId: values.clientId ?? null,
        appointmentId: values.appointmentId ?? null,
        vehicleId:
          values.mode === 'OWN_VEHICLE' ? values.vehicleId || null : null,
        distanceKm:
          values.distanceKm.trim() !== ''
            ? parseDecimalInput(values.distanceKm, 2)
            : null,
        cost:
          values.mode === 'RIDE'
            ? parseDecimalInput(values.cost, 2)
            : undefined,
      };

      // A trip still waiting in the outbox is edited there: creating it online
      // here would leave the queued create to post a second copy on sync.
      const isPendingCreate = trip != null && isLocalTripId(trip.id);
      if (token && !isPendingCreate) {
        try {
          const saved = trip
            ? await tripService.update(token, trip.id, dto)
            : await tripService.create(token, dto);
          onSuccess?.(saved);
          return saved;
        } catch (apiErr) {
          if (!isNetworkError(apiErr)) {
            throw apiErr;
          }
        }
      }

      let savedTrip: Trip;
      if (trip) {
        await queueTripUpdate(userId, trip.id, dto, previewCost);
        savedTrip = {
          ...trip,
          ...dto,
          cost: String(previewCost),
          pendingSync: true,
        };
      } else {
        const clientGeneratedId = newTripClientGeneratedId();
        await queueTripCreate(userId, clientGeneratedId, dto, previewCost);
        savedTrip = pendingCreateToTrip(clientGeneratedId, dto, previewCost);
      }

      onSuccess?.(savedTrip);
      return savedTrip;
    } catch {
      setErrors(prev => ({ ...prev, general: 'saveFailed' }));
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [values, token, trip, previewCost, userId, onSuccess]);

  const remove = useCallback(async (): Promise<boolean> => {
    if (!trip) return false;
    setSubmitting(true);
    try {
      if (token && !isLocalTripId(trip.id)) {
        try {
          await tripService.remove(token, trip.id);
          onDeleted?.(trip.id);
          return true;
        } catch (apiErr) {
          if (!isNetworkError(apiErr)) {
            throw apiErr;
          }
        }
      }

      await queueTripDelete(userId, trip.id);
      onDeleted?.(trip.id);
      return true;
    } catch {
      setErrors(prev => ({ ...prev, general: 'deleteFailed' }));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [trip, token, userId, onDeleted]);

  return {
    values,
    errors,
    submitting,
    isEditing: Boolean(trip),
    mode: values.mode,
    previewCost,
    vehicles,
    selectedVehicle,
    isLoadingVehicles,
    clientSearch: {
      term: clientSearch.term,
      status: clientSearch.status,
      options: clientSearch.options,
      onChangeText: onClientSearchTermChange,
      onSelect: onSelectClient,
    },
    setFieldValue,
    setMode,
    submit,
    remove,
  };
}
