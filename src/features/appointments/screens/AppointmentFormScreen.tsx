import { useEffect, useState } from 'react';

import { ConfirmDialog } from 'app/components/ui/confirm-dialog';
import { useTranslation } from 'shared/i18n';

import { AppointmentFormSheet } from '../components/AppointmentFormSheet';
import { ConflictAlertSheet } from '../components/ConflictAlertSheet';
import {
  appointmentToDraft,
  createDraft,
  SPECIES_OPTIONS,
  toTimeInput,
  type Appointment,
  type ConflictingAppointment,
  type Species,
} from '../domain/appointment';
import { useAppointmentForm } from '../hooks/useAppointmentForm';

type AppointmentFormScreenProps = {
  visible: boolean;
  /** O agendamento a editar. Ausente, a folha cria um novo. */
  appointment?: Appointment | null;
  /** Dia escolhido no calendário (`2026-09-21`), que já abre preenchido. */
  selectedDate?: string | null;
  onClose: () => void;
  /** Chamado depois de salvar, para quem abriu atualizar lista e calendário. */
  onSaved?: (appointment: Appointment) => void;
};

/**
 * Folha de criação e edição de agendamento (US07).
 *
 * Quem a abre guarda só o `visible` e o que ela precisa para decidir o modo;
 * rascunho, validação, conflito de horário e salvamento vivem no hook.
 */
export function AppointmentFormScreen({
  visible,
  appointment = null,
  selectedDate = null,
  onClose,
  onSaved,
}: AppointmentFormScreenProps) {
  const { t } = useTranslation();
  const form = useAppointmentForm(appointment?.id ?? null);
  const { reset } = form;
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  // O último conflito continua desenhado enquanto o alerta anima a saída:
  // `form.conflict` já volta a null no toque em "Ajustar horário".
  const [shownConflict, setShownConflict] =
    useState<ConflictingAppointment | null>(null);

  useEffect(() => {
    if (form.conflict) {
      setShownConflict(form.conflict);
    }
  }, [form.conflict]);

  // A folha fica montada entre aberturas, então sem isto a segunda abertura
  // traria o rascunho e os erros da primeira.
  useEffect(() => {
    if (visible) {
      reset(
        appointment
          ? appointmentToDraft(appointment)
          : createDraft(selectedDate),
      );
      setIsDiscardOpen(false);
    }
  }, [visible, appointment, selectedDate, reset]);

  // Toda saída — botão Cancelar, toque fora, voltar do Android — passa por
  // aqui: fechar pelo fundo sem perguntar descartaria o que o botão protege.
  const requestCancel = () => {
    if (form.isDirty) {
      setIsDiscardOpen(true);
      return;
    }

    onClose();
  };

  const finish = (saved: Appointment | null) => {
    if (saved) {
      onSaved?.(saved);
      onClose();
    }
  };

  const submit = async () => finish(await form.submit());

  const speciesLabels = Object.fromEntries(
    SPECIES_OPTIONS.map(species => [
      species,
      t(`appointments.species.${species}`),
    ]),
  ) as Record<Species, string>;

  const failureMessage = form.failure ? t('appointments.errors.UNKNOWN') : null;

  return (
    <AppointmentFormSheet
      visible={visible}
      onCancel={requestCancel}
      onSubmit={submit}
      draft={form.draft}
      errors={form.errors}
      serviceTakers={form.serviceTakers}
      isSaving={form.isSaving}
      onDateChange={form.setDate}
      onStartTimeChange={form.setStartTime}
      onEndTimeChange={form.setEndTime}
      onClientChange={form.setClientId}
      onPatientNameChange={form.setPatientName}
      onProcedureNameChange={form.setProcedureName}
      onAmountChange={form.setAmount}
      onSpeciesChange={form.setSpecies}
      onAgeYearsChange={form.setAgeYears}
      onWeightKgChange={form.setWeightKg}
      onAsaClassChange={form.setAsaClass}
      onNotesChange={form.setNotes}
      labels={{
        title: t(
          appointment
            ? 'appointments.form.titleEdit'
            : 'appointments.form.titleCreate',
        ),
        cancel: t('appointments.form.cancel'),
        patient: t('appointments.form.patientLabel'),
        patientPlaceholder: t('appointments.form.patientPlaceholder'),
        procedure: t('appointments.form.procedureLabel'),
        procedurePlaceholder: t('appointments.form.procedurePlaceholder'),
        clinic: t('appointments.form.clinicLabel'),
        clinicPlaceholder: t('appointments.form.clinicPlaceholder'),
        age: t('appointments.form.ageLabel'),
        agePlaceholder: t('appointments.form.agePlaceholder'),
        weight: t('appointments.form.weightLabel'),
        weightPlaceholder: t('appointments.form.weightPlaceholder'),
        startTime: t('appointments.form.startTimeLabel'),
        endTime: t('appointments.form.endTimeLabel'),
        timePlaceholder: t('appointments.form.timePlaceholder'),
        date: t('appointments.form.dateLabel'),
        datePlaceholder: t('appointments.form.datePlaceholder'),
        amount: t('appointments.form.amountLabel'),
        amountPlaceholder: t('appointments.form.amountPlaceholder'),
        species: t('appointments.form.speciesLabel'),
        asa: t('appointments.form.asaLabel'),
        notes: t('appointments.form.notesLabel'),
        notesPlaceholder: t('appointments.form.notesPlaceholder'),
        confirm: t('appointments.form.confirm'),
      }}
      speciesLabels={speciesLabels}
      errorMessages={{
        required: t('appointments.errors.required'),
        invalidDate: t('appointments.errors.invalidDate'),
        invalidTime: t('appointments.errors.invalidTime'),
        endBeforeStart: t('appointments.errors.endBeforeStart'),
        mustBePositive: t('appointments.errors.mustBePositive'),
      }}
      failureMessage={failureMessage}
    >
      <ConfirmDialog
        visible={isDiscardOpen}
        title={t('appointments.form.discard.title')}
        message={t('appointments.form.discard.message')}
        confirmLabel={t('appointments.form.discard.confirm')}
        cancelLabel={t('appointments.form.discard.cancel')}
        onConfirm={() => {
          setIsDiscardOpen(false);
          onClose();
        }}
        onCancel={() => setIsDiscardOpen(false)}
      />
      {shownConflict ? (
        <ConflictAlertSheet
          visible={form.conflict !== null}
          conflictingAppointment={{
            procedureName: shownConflict.procedureName,
            time: toTimeInput(shownConflict.startsAt),
          }}
          onAdjust={form.dismissConflict}
        />
      ) : null}
    </AppointmentFormSheet>
  );
}
