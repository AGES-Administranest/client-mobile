import { useCallback, useEffect, useState } from 'react';

import { useAuth } from 'features/auth';

import {
  EMPTY_APPOINTMENT_DRAFT,
  formatAgeInput,
  formatAmountInput,
  formatDateInput,
  formatTimeInput,
  formatWeightInput,
  isAppointmentValid,
  isDraftDirty,
  toAppointmentPayload,
  validateAppointmentDraft,
  type Appointment,
  type AppointmentDraft,
  type AppointmentErrors,
  type AsaClass,
  type ConflictingAppointment,
  type Species,
} from '../domain/appointment';
import {
  createAppointment,
  readTimeConflict,
  updateAppointment,
  type SaveAppointmentOptions,
} from '../services/appointmentService';
import {
  fetchServiceTakers,
  type ServiceTaker,
} from '../services/serviceTakerService';

export type AppointmentFailure = {
  code: string;
};

export type AppointmentFormState = {
  draft: AppointmentDraft;
  errors: AppointmentErrors;
  failure: AppointmentFailure | null;
  conflict: ConflictingAppointment | null;
  serviceTakers: ServiceTaker[];
  isSaving: boolean;
  isDirty: boolean;
  setDate: (value: string) => void;
  setStartTime: (value: string) => void;
  setEndTime: (value: string) => void;
  setClientId: (clientId: string) => void;
  setPatientName: (value: string) => void;
  setProcedureName: (value: string) => void;
  setAmount: (value: string) => void;
  setSpecies: (species: Species) => void;
  setAgeYears: (value: string) => void;
  setWeightKg: (value: string) => void;
  setAsaClass: (asaClass: AsaClass) => void;
  setNotes: (value: string) => void;
  reset: (initial: AppointmentDraft) => void;
  submit: () => Promise<Appointment | null>;
  confirmDespiteConflict: () => Promise<Appointment | null>;
  dismissConflict: () => void;
};

/**
 * Estado da folha de agendamento, nos dois modos.
 *
 * `appointmentId` decide o modo: null cria, um id edita. O rascunho inicial
 * (vazio com a data do calendário, ou o agendamento existente) entra por
 * `reset` a cada abertura, e é contra ele que `isDirty` compara — é o que
 * decide se cancelar pede confirmação.
 */
export function useAppointmentForm(
  appointmentId: string | null,
): AppointmentFormState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? '';
  const [initialDraft, setInitialDraft] = useState<AppointmentDraft>(
    EMPTY_APPOINTMENT_DRAFT,
  );
  const [draft, setDraft] = useState<AppointmentDraft>(EMPTY_APPOINTMENT_DRAFT);
  const [errors, setErrors] = useState<AppointmentErrors>({});
  const [failure, setFailure] = useState<AppointmentFailure | null>(null);
  const [conflict, setConflict] = useState<ConflictingAppointment | null>(null);
  const [serviceTakers, setServiceTakers] = useState<ServiceTaker[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    fetchServiceTakers(idToken)
      .then(result => {
        if (isMounted) {
          setServiceTakers(result);
        }
      })
      .catch(() => {
        if (isMounted) {
          setServiceTakers([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [idToken]);

  const update = useCallback(
    <K extends keyof AppointmentDraft>(field: K, value: AppointmentDraft[K]) =>
      setDraft(current => ({ ...current, [field]: value })),
    [],
  );

  const setDate = useCallback(
    (value: string) => update('date', formatDateInput(value)),
    [update],
  );
  const setStartTime = useCallback(
    (value: string) => update('startTime', formatTimeInput(value)),
    [update],
  );
  const setEndTime = useCallback(
    (value: string) => update('endTime', formatTimeInput(value)),
    [update],
  );
  const setClientId = useCallback(
    (clientId: string) => update('clientId', clientId),
    [update],
  );
  const setPatientName = useCallback(
    (value: string) => update('patientName', value),
    [update],
  );
  const setProcedureName = useCallback(
    (value: string) => update('procedureName', value),
    [update],
  );
  const setAmount = useCallback(
    (value: string) => update('amount', formatAmountInput(value)),
    [update],
  );
  const setSpecies = useCallback(
    (species: Species) => update('species', species),
    [update],
  );
  const setAgeYears = useCallback(
    (value: string) => update('ageYears', formatAgeInput(value)),
    [update],
  );
  const setWeightKg = useCallback(
    (value: string) => update('weightKg', formatWeightInput(value)),
    [update],
  );
  const setNotes = useCallback(
    (value: string) => update('notes', value),
    [update],
  );

  const setAsaClass = useCallback(
    (asaClass: AsaClass) =>
      setDraft(current => ({
        // Tocar de novo na classificação já escolhida a desmarca: ASA é
        // opcional e sem isso não haveria como voltar atrás depois de marcar.
        ...current,
        asaClass: current.asaClass === asaClass ? null : asaClass,
      })),
    [],
  );

  const reset = useCallback((initial: AppointmentDraft) => {
    setInitialDraft(initial);
    setDraft(initial);
    setErrors({});
    setFailure(null);
    setConflict(null);
    setIsSaving(false);
  }, []);

  const save = useCallback(
    async (options: SaveAppointmentOptions) => {
      const validationErrors = validateAppointmentDraft(draft);
      setErrors(validationErrors);
      setFailure(null);
      setConflict(null);

      const payload = isAppointmentValid(validationErrors)
        ? toAppointmentPayload(draft)
        : null;

      if (payload === null) {
        return null;
      }

      setIsSaving(true);

      try {
        const saved = appointmentId
          ? await updateAppointment(idToken, appointmentId, payload, options)
          : await createAppointment(idToken, payload, options);

        setIsSaving(false);
        return saved;
      } catch (error) {
        setIsSaving(false);

        const conflicting = readTimeConflict(error);

        if (conflicting) {
          setConflict(conflicting);
        } else {
          setFailure({ code: 'UNKNOWN' });
        }

        return null;
      }
    },
    [appointmentId, draft, idToken],
  );

  const submit = useCallback(() => save({}), [save]);

  const confirmDespiteConflict = useCallback(
    () => save({ force: true }),
    [save],
  );

  const dismissConflict = useCallback(() => setConflict(null), []);

  return {
    draft,
    errors,
    failure,
    conflict,
    serviceTakers,
    isSaving,
    isDirty: isDraftDirty(draft, initialDraft),
    setDate,
    setStartTime,
    setEndTime,
    setClientId,
    setPatientName,
    setProcedureName,
    setAmount,
    setSpecies,
    setAgeYears,
    setWeightKg,
    setAsaClass,
    setNotes,
    reset,
    submit,
    confirmDespiteConflict,
    dismissConflict,
  };
}
