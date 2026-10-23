import { useMemo, useState } from 'react';

import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { useAuth } from 'features/auth';
import {
  calculateTripCost,
  newTripClientGeneratedId,
  parseDecimalInput,
  queueTripCreate,
  queueTripDelete,
  tripService,
  useTrips,
  type Trip,
  type TripMode,
} from 'features/trips';
import { useVehicles } from 'features/vehicles';
import { isNetworkError } from 'shared/utils/network';

import {
  TravelSectionPresentation,
  type TravelSectionTexts,
} from './TravelSectionPresentation';

export type { TravelSectionTexts };

export type TravelSectionProps = {
  editable: boolean;
  texts: TravelSectionTexts;
  appointmentId?: string | null;
  clientId?: string | null;
  occurredOn?: string;
  defaultDestination?: string;
  onOpenVehicles?: () => void;
};

export function TravelSection({
  editable,
  texts,
  appointmentId,
  clientId,
  occurredOn,
  defaultDestination,
  onOpenVehicles,
}: TravelSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<TripMode>('OWN_VEHICLE');
  const [origin, setOrigin] = useState('Casa');
  const [destination, setDestination] = useState(defaultDestination ?? '');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [cost, setCost] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);

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

  const { vehicles, isLoading: isLoadingVehicles } = useVehicles({
    token,
    autoFetch: true,
  });

  const {
    trips: allTrips,
    refetch: refetchTrips,
  } = useTrips({
    appointmentId: appointmentId ?? undefined,
    autoFetch: Boolean(appointmentId),
  });

  // Filter trips for this appointment
  const appointmentTrips = useMemo(() => {
    if (!appointmentId) return allTrips;
    return allTrips.filter(t => t.appointmentId === appointmentId);
  }, [allTrips, appointmentId]);

  const vehicleNamesById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of vehicles) {
      map[v.id] = `${v.brand} ${v.model}`;
    }
    return map;
  }, [vehicles]);

  const selectedVehicle = useMemo(
    () => vehicles.find(v => v.id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  );

  const previewCost = useMemo(() => {
    return calculateTripCost({
      mode,
      distanceKm,
      costPerKm: selectedVehicle?.costPerKm,
      cost,
    });
  }, [mode, distanceKm, selectedVehicle?.costPerKm, cost]);

  const handleConfirm = async () => {
    setError(null);

    if (!origin.trim()) {
      setError('Informe a origem');
      return;
    }
    if (!destination.trim()) {
      setError('Informe o destino');
      return;
    }

    if (mode === 'OWN_VEHICLE') {
      if (!selectedVehicleId) {
        setError('Selecione um carro');
        return;
      }
      const dist = parseDecimalInput(distanceKm, 2);
      if (dist === null || dist <= 0) {
        setError('Informe uma distância válida maior que zero');
        return;
      }
    } else {
      const val = parseDecimalInput(cost, 2);
      if (val === null || val <= 0) {
        setError('Informe o valor pago');
        return;
      }
    }

    setSubmitting(true);
    try {
      const tripDate =
        occurredOn || new Date().toISOString().slice(0, 10);
      const dto = {
        mode,
        occurredOn: tripDate,
        origin: origin.trim(),
        destination: destination.trim(),
        appointmentId: appointmentId ?? null,
        clientId: clientId ?? null,
        vehicleId: mode === 'OWN_VEHICLE' ? selectedVehicleId : null,
        distanceKm:
          distanceKm.trim() !== '' ? parseDecimalInput(distanceKm, 2) : null,
        cost: mode === 'RIDE' ? parseDecimalInput(cost, 2) : undefined,
      };

      if (token) {
        try {
          await tripService.create(token, dto);
          refetchTrips();
          setExpanded(false);
          setDistanceKm('');
          setCost('');
          return;
        } catch (apiErr) {
          if (!isNetworkError(apiErr)) {
            throw apiErr;
          }
        }
      }

      // Offline fallback
      const clientGeneratedId = newTripClientGeneratedId();
      await queueTripCreate(userId, clientGeneratedId, dto, previewCost);
      refetchTrips();
      setExpanded(false);
      setDistanceKm('');
      setCost('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTrip = async () => {
    if (!tripToDelete) return;
    try {
      if (token && !tripToDelete.id.startsWith('local:')) {
        try {
          await tripService.remove(token, tripToDelete.id);
          setTripToDelete(null);
          refetchTrips();
          return;
        } catch (apiErr) {
          if (!isNetworkError(apiErr)) {
            throw apiErr;
          }
        }
      }

      await queueTripDelete(userId, tripToDelete.id);
      setTripToDelete(null);
      refetchTrips();
    } catch {
      // Ignored
      setTripToDelete(null);
    }
  };

  return (
    <>
      <TravelSectionPresentation
        editable={editable}
        expanded={expanded}
        onToggleExpanded={() => setExpanded(prev => !prev)}
        trips={appointmentTrips}
        vehicles={vehicles}
        hasNoVehicles={!isLoadingVehicles && vehicles.length === 0}
        onOpenVehicles={onOpenVehicles}
        mode={mode}
        onModeChange={setMode}
        origin={origin}
        onOriginChange={setOrigin}
        destination={destination}
        onDestinationChange={setDestination}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicleId={setSelectedVehicleId}
        distanceKm={distanceKm}
        onDistanceKmChange={setDistanceKm}
        cost={cost}
        onCostChange={setCost}
        previewCost={previewCost}
        submitting={submitting}
        error={error}
        onConfirm={handleConfirm}
        onDeleteTrip={trip => setTripToDelete(trip)}
        vehicleNamesById={vehicleNamesById}
        texts={texts}
      />

      <ConfirmSheet
        visible={tripToDelete !== null}
        title="Excluir deslocamento"
        message="Deseja remover este deslocamento do atendimento?"
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleDeleteTrip}
        onCancel={() => setTripToDelete(null)}
      />
    </>
  );
}
