import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';

import { ConfirmDialog } from 'app/components/ui/confirm-dialog';
import { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

import {
  TripFormSheetPresentation,
  type TripFormTexts,
} from '../components/TripFormSheetPresentation';
import type { Trip } from '../domain/trip.types';
import { toNumber } from '../domain/tripFormat';
import {
  parseDecimalInput,
  type TripFormErrorCode,
  type TripSubmitErrorCode,
} from '../domain/validateTripForm';
import { useTripForm } from '../hooks/useTripForm';

export type TripFormSheetProps = {
  visible: boolean;
  onClose: () => void;
  trip?: Trip | null;
  clientName?: string;
  appointmentId?: string | null;
  clientId?: string | null;
  defaultOccurredOn?: string;
  defaultOrigin?: string;
  defaultDestination?: string;
  onSuccess?: (savedTrip: Trip) => void;
  onDeleted?: (tripId: string) => void;
};

export function TripFormSheet({
  visible,
  onClose,
  trip,
  clientName,
  appointmentId,
  clientId,
  defaultOccurredOn,
  defaultOrigin,
  defaultDestination,
  onSuccess,
  onDeleted,
}: TripFormSheetProps) {
  const { t, locale } = useTranslation();
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const form = useTripForm({
    trip,
    clientName,
    appointmentId,
    clientId,
    defaultOccurredOn,
    defaultOrigin,
    defaultDestination,
    active: visible,
    onSuccess: saved => {
      onSuccess?.(saved);
      onClose();
    },
    onDeleted: id => {
      onDeleted?.(id);
      setDeleteConfirmVisible(false);
      onClose();
    },
  });

  const money = (value: number) =>
    formatCurrency(value, locale, { showCents: true });
  const vehicleLabel = (vehicle: (typeof form.vehicles)[number]) =>
    t('trips.form.vehicleOption', {
      name: `${vehicle.brand} ${vehicle.model}`,
      costPerKm: money(toNumber(vehicle.costPerKm)),
    });

  const distance = parseDecimalInput(form.values.distanceKm, 2);
  const previewFormula =
    form.selectedVehicle && distance !== null && distance > 0
      ? t('trips.form.previewFormula', {
          distance: distance.toLocaleString(locale),
          costPerKm: money(toNumber(form.selectedVehicle.costPerKm)),
        })
      : null;

  // Until the vehicle and the distance (or the amount paid) are filled in,
  // there is no cost to show: the box keeps a dash instead of R$ 0,00.
  const previewIsKnown =
    form.mode === 'OWN_VEHICLE'
      ? previewFormula !== null
      : (parseDecimalInput(form.values.cost, 2) ?? 0) > 0;

  const errorText = (
    code: TripFormErrorCode | TripSubmitErrorCode | undefined,
  ) => (code ? t(`trips.errors.${code}`) : undefined);

  const texts: TripFormTexts = {
    title: trip ? t('trips.form.editTitle') : t('trips.form.newTitle'),
    close: t('trips.form.close'),
    modeLabel: t('trips.form.modeLabel'),
    ownVehicle: t('trips.form.ownVehicle'),
    ride: t('trips.form.ride'),
    origin: t('trips.form.origin'),
    originPlaceholder: t('trips.form.originPlaceholder'),
    destination: t('trips.form.destination'),
    destinationPlaceholder: t('trips.form.destinationPlaceholder'),
    vehicle: t('trips.form.vehicle'),
    vehiclePlaceholder: t('trips.form.vehiclePlaceholder'),
    noVehicles: t('trips.form.noVehicles'),
    cost: t('trips.form.cost'),
    costPlaceholder: t('trips.form.costPlaceholder'),
    distance: t('trips.form.distance'),
    distancePlaceholder: t('trips.form.distancePlaceholder'),
    date: t('trips.form.date'),
    datePlaceholder: t('trips.form.datePlaceholder'),
    previewTitle: t('trips.form.previewTitle'),
    previewFormula,
    previewPickVehicle: t('trips.form.previewPickVehicle'),
    previewInformDistance: t('trips.form.previewInformDistance'),
    previewInformed: t('trips.form.previewInformed'),
    previewInformCost: t('trips.form.previewInformCost'),
    previewCost: previewIsKnown ? money(form.previewCost) : null,
    client: t('trips.form.client'),
    clientPlaceholder: t('trips.form.clientPlaceholder'),
    clientMessages: {
      loading: t('trips.form.clientLoading'),
      empty: t('trips.form.clientEmpty'),
      error: t('trips.form.clientError'),
    },
    save: t('trips.form.save'),
    saving: t('trips.form.saving'),
    delete: t('trips.form.delete'),
    errors: {
      occurredOn: errorText(form.errors.occurredOn),
      origin: errorText(form.errors.origin),
      destination: errorText(form.errors.destination),
      vehicleId: errorText(form.errors.vehicleId),
      distanceKm: errorText(form.errors.distanceKm),
      cost: errorText(form.errors.cost),
      general: errorText(form.errors.general),
    },
  };

  return (
    <>
      <TripFormSheetPresentation
        visible={visible}
        onClose={onClose}
        texts={texts}
        isEditing={Boolean(trip)}
        values={form.values}
        errors={form.errors}
        mode={form.mode}
        onModeChange={form.setMode}
        onFieldValueChange={form.setFieldValue}
        vehicleOptions={form.vehicles.map(vehicle => ({
          id: vehicle.id,
          label: vehicleLabel(vehicle),
        }))}
        selectedVehicleLabel={
          form.selectedVehicle ? vehicleLabel(form.selectedVehicle) : null
        }
        isLoadingVehicles={form.isLoadingVehicles}
        clientSearchTerm={form.clientSearch.term}
        clientSearchStatus={form.clientSearch.status}
        clientSearchOptions={form.clientSearch.options}
        onClientSearchTermChange={form.clientSearch.onChangeText}
        onSelectClient={form.clientSearch.onSelect}
        submitting={form.submitting}
        onSubmit={form.submit}
        onDelete={trip ? () => setDeleteConfirmVisible(true) : undefined}
      />

      <ConfirmDialog
        visible={deleteConfirmVisible}
        title={t('trips.deleteConfirm.title')}
        message={t('trips.deleteConfirm.message')}
        confirmIcon={Trash2}
        cancelAppearance="button"
        confirmLabel={t('trips.deleteConfirm.confirm')}
        cancelLabel={t('trips.deleteConfirm.cancel')}
        onConfirm={() => {
          form.remove().catch(() => undefined);
        }}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
    </>
  );
}
