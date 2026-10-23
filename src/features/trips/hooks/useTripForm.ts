import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from 'features/auth';
import { useClientSearch } from 'features/clients';
import { useVehicles } from 'features/vehicles';
import { isNetworkError } from 'shared/utils/network';

import { calculateTripCost } from '../domain/calculateTripCost';
import type { Trip, TripMode } from '../domain/trip.types';
import {
  EMPTY_TRIP_FORM,
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
  appointmentId?: string | null;
  clientId?: string | null;
  defaultOccurredOn?: string;
  defaultOrigin?: string;
  defaultDestination?: string;
  token?: string;
  active?: boolean;
  onSuccess?: (savedTrip: Trip) => void;
  onDeleted?: (tripId: string) => void;
};

export function useTripForm(options: UseTripFormOptions = {}) {
  const {
    trip,
    appointmentId,
    clientId: initialClientId,
    defaultOccurredOn,
    defaultOrigin,
    defaultDestination,
    token: propToken,
    active = true,
    onSuccess,
    onDeleted,
  } = options;

  let sessionToken: string | undefined;
  let currentUserId: string | null = null;
  try {
    const auth = useAuth();
    sessionToken = auth.session?.idToken;
    currentUserId = auth.account?.id ?? null;
  } catch {
    sessionToken = undefined;
  }
  const token = propToken ?? sessionToken ?? '';
  const userId = currentUserId ?? 'anonymous';

  const { vehicles, isLoading: isLoadingVehicles } = useVehicles({
    token,
    autoFetch: active,
  });

  const [values, setValues] = useState<TripFormValues>(() => {
    if (trip) {
      return {
        occurredOn: trip.occurredOn,
        origin: trip.origin,
        destination: trip.destination,
        mode: trip.mode,
        vehicleId: trip.vehicleId ?? '',
        distanceKm: trip.distanceKm != null ? String(trip.distanceKm) : '',
        cost: trip.mode === 'RIDE' ? String(trip.cost) : '',
        clientId: trip.clientId ?? null,
        appointmentId: trip.appointmentId ?? null,
      };
    }
    return {
      ...EMPTY_TRIP_FORM,
      occurredOn:
        defaultOccurredOn ?? new Date().toISOString().slice(0, 10),
      origin: defaultOrigin ?? '',
      destination: defaultDestination ?? '',
      clientId: initialClientId ?? null,
      appointmentId: appointmentId ?? null,
    };
  });

  const [errors, setErrors] = useState<TripFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [isClientSearchPaused, setIsClientSearchPaused] = useState(
    Boolean(values.clientId),
  );

  const clientSearch = useClientSearch({
    active,
    paused: isClientSearchPaused,
  });

  // Re-sync form when trip or active changes
  useEffect(() => {
    if (trip) {
      setValues({
        occurredOn: trip.occurredOn,
        origin: trip.origin,
        destination: trip.destination,
        mode: trip.mode,
        vehicleId: trip.vehicleId ?? '',
        distanceKm: trip.distanceKm != null ? String(trip.distanceKm) : '',
        cost: trip.mode === 'RIDE' ? String(trip.cost) : '',
        clientId: trip.clientId ?? null,
        appointmentId: trip.appointmentId ?? null,
      });
      setIsClientSearchPaused(Boolean(trip.clientId));
      setErrors({});
    } else if (active) {
      setValues(prev => ({
        ...prev,
        occurredOn:
          defaultOccurredOn ??
          prev.occurredOn ??
          new Date().toISOString().slice(0, 10),
        origin: prev.origin || (defaultOrigin ?? ''),
        destination: prev.destination || (defaultDestination ?? ''),
        clientId: prev.clientId ?? initialClientId ?? null,
        appointmentId: prev.appointmentId ?? appointmentId ?? null,
      }));
    }
  }, [
    trip,
    active,
    defaultOccurredOn,
    defaultOrigin,
    defaultDestination,
    initialClientId,
    appointmentId,
  ]);

  const selectedVehicle = useMemo(
    () => vehicles.find(v => v.id === values.vehicleId) ?? null,
    [vehicles, values.vehicleId],
  );

  const previewCost = useMemo(() => {
    return calculateTripCost({
      mode: values.mode,
      distanceKm: values.distanceKm,
      costPerKm: selectedVehicle?.costPerKm,
      cost: values.cost,
    });
  }, [values.mode, values.distanceKm, selectedVehicle?.costPerKm, values.cost]);

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
      clientSearch.onTermChange(option.name);
      setIsClientSearchPaused(true);
      setErrors(prev => {
        const next = { ...prev };
        delete next.clientId;
        return next;
      });
    },
    [clientSearch],
  );

  const onClientSearchTermChange = useCallback(
    (term: string) => {
      setIsClientSearchPaused(false);
      clientSearch.onTermChange(term);
      if (!term.trim()) {
        setValues(prev => ({ ...prev, clientId: null }));
      }
    },
    [clientSearch],
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

      let savedTrip: Trip;

      if (token) {
        try {
          if (trip && !trip.id.startsWith('local:')) {
            savedTrip = await tripService.update(token, trip.id, dto);
          } else {
            savedTrip = await tripService.create(token, dto);
          }
          onSuccess?.(savedTrip);
          return savedTrip;
        } catch (apiErr) {
          // If network error, fallback to offline store
          if (!isNetworkError(apiErr)) {
            throw apiErr;
          }
        }
      }

      // Offline flow
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrors(prev => ({ ...prev, general: message }));
      return null;
    } finally {
      setSubmitting(false);
    }
  }, [values, token, trip, previewCost, userId, onSuccess]);

  const remove = useCallback(async (): Promise<boolean> => {
    if (!trip) return false;
    setSubmitting(true);
    try {
      if (token && !trip.id.startsWith('local:')) {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrors(prev => ({ ...prev, general: message }));
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
