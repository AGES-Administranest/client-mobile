import { useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import { maskDateInput, maskTimeInput } from '../domain/procedureMasks';
import {
  suggestReschedule,
  toReschedulePayload,
  validateReschedule,
  type RescheduleErrors,
  type RescheduleField,
  type RescheduleValues,
} from '../domain/reschedule';
import { updateAppointment } from '../services/procedureService';

export type ReschedulableAppointment = {
  id: string;
  startsAt: string;
  endsAt: string | null;
};

export type RescheduleFailure = 'CONFLICT' | 'FAILED';

export type RescheduleState = {
  visible: boolean;
  values: RescheduleValues;
  errors: RescheduleErrors;
  failure: RescheduleFailure | null;
  submitting: boolean;
  /** Remarcado nesta visita à tela: a ação mostra o aviso. */
  done: boolean;
  open: () => void;
  close: () => void;
  setField: (field: RescheduleField, value: string) => void;
  confirm: () => Promise<void>;
};

const MASKS: Record<RescheduleField, (value: string) => string> = {
  date: maskDateInput,
  startTime: maskTimeInput,
  endTime: maskTimeInput,
};

const EMPTY: RescheduleValues = { date: '', startTime: '', endTime: '' };

// Não realizado: o mesmo agendamento continua SCHEDULED e só muda de data. O
// PATCH do backend já recusa horário em conflito (409).
export function useRescheduleAppointment(
  appointment: ReschedulableAppointment,
  onChanged: () => void,
): RescheduleState {
  const { session } = useAuth();
  const [visible, setVisible] = useState(false);
  const [values, setValues] = useState<RescheduleValues>(EMPTY);
  const [errors, setErrors] = useState<RescheduleErrors>({});
  const [failure, setFailure] = useState<RescheduleFailure | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    setVisible(false);
    setDone(false);
  }, [appointment.id]);

  function open(): void {
    setValues(suggestReschedule(appointment.startsAt, appointment.endsAt));
    setErrors({});
    setFailure(null);
    setDone(false);
    setVisible(true);
  }

  function close(): void {
    if (!submitting) {
      setVisible(false);
    }
  }

  function setField(field: RescheduleField, value: string): void {
    setValues(current => ({ ...current, [field]: MASKS[field](value) }));
    setErrors(current => ({ ...current, [field]: undefined }));
    setFailure(null);
  }

  async function confirm(): Promise<void> {
    if (submitting) {
      return;
    }
    const validation = validateReschedule(values, new Date());
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }
    if (!session) {
      setFailure('FAILED');
      return;
    }

    setSubmitting(true);
    setFailure(null);
    try {
      await updateAppointment(
        session.idToken,
        appointment.id,
        toReschedulePayload(values),
      );
      if (isMounted.current) {
        setVisible(false);
        setDone(true);
        onChanged();
      }
    } catch (error) {
      if (isMounted.current) {
        setFailure(
          error instanceof ApiError &&
            error.code === 'APPOINTMENT_TIME_CONFLICT'
            ? 'CONFLICT'
            : 'FAILED',
        );
      }
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  }

  return {
    visible,
    values,
    errors,
    failure,
    submitting,
    done,
    open,
    close,
    setField,
    confirm,
  };
}
