import { useState } from 'react';

import { ConfirmSheet } from 'app/components/ui/confirm-sheet';

import { TripFormSheetPresentation } from './TripFormSheetPresentation';
import type { Trip } from '../domain/trip.types';
import { useTripForm } from '../hooks/useTripForm';

export type TripFormSheetProps = {
  visible: boolean;
  onClose: () => void;
  trip?: Trip | null;
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
  appointmentId,
  clientId,
  defaultOccurredOn,
  defaultOrigin,
  defaultDestination,
  onSuccess,
  onDeleted,
}: TripFormSheetProps) {
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const form = useTripForm({
    trip,
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

  const handleDelete = async () => {
    await form.remove();
  };

  return (
    <>
      <TripFormSheetPresentation
        visible={visible}
        onClose={onClose}
        title={trip ? 'Editar deslocamento' : 'Novo deslocamento'}
        isEditing={Boolean(trip)}
        values={form.values}
        errors={form.errors}
        mode={form.mode}
        onModeChange={form.setMode}
        onFieldValueChange={form.setFieldValue}
        previewCost={form.previewCost}
        vehicles={form.vehicles}
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

      <ConfirmSheet
        visible={deleteConfirmVisible}
        title="Excluir deslocamento"
        message="Deseja realmente excluir este deslocamento? A despesa também será removida das finanças."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
    </>
  );
}
