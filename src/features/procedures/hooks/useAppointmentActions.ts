import { useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import type { AppointmentStatus } from '../domain/procedure.types';
import {
  toCompletionOutcome,
  type AppointmentActionNotice,
  type CompletionErrorInfo,
} from '../domain/toCompletionOutcome';
import { completeAppointment } from '../services/procedureService';

export type ActionableAppointment = {
  id: string;
  status: AppointmentStatus;
};

export type AppointmentActionsState = {
  visible: boolean;
  submitting: boolean;
  notice: AppointmentActionNotice | null;
  complete: () => Promise<void>;
};

function toErrorInfo(error: unknown): CompletionErrorInfo | null {
  if (error instanceof ApiError) {
    return { status: error.status, code: error.code, details: error.details };
  }
  return null;
}

export function useAppointmentActions(
  appointment: ActionableAppointment,
  onChanged: () => void,
): AppointmentActionsState {
  const { session } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<AppointmentActionNotice | null>(null);
  const inFlight = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    setNotice(null);
  }, [appointment.id]);

  async function complete(): Promise<void> {
    if (inFlight.current) {
      return;
    }
    if (!session) {
      setNotice('FAILED');
      return;
    }

    inFlight.current = true;
    setSubmitting(true);
    setNotice(null);
    try {
      // Corpo vazio: os dados são editados antes, pelo lápis, e o backend
      // usa o valor salvo no agendamento.
      await completeAppointment(session.idToken, appointment.id, {});
      if (isMounted.current) {
        onChanged();
      }
    } catch (error) {
      if (!isMounted.current) {
        return;
      }
      const outcome = toCompletionOutcome(toErrorInfo(error));
      if (outcome === 'COMPLETED') {
        onChanged();
      } else if (outcome === 'CANCELED') {
        setNotice('CANCELED');
        onChanged();
      } else if (outcome === 'NOT_FOUND') {
        setNotice('FAILED');
        onChanged();
      } else {
        setNotice(outcome);
      }
    } finally {
      inFlight.current = false;
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  }

  return {
    // O aviso de cancelado continua na tela depois que a busca de novo
    // traz o status CANCELED; sem isso ele sumiria junto com o botão.
    visible: appointment.status === 'SCHEDULED' || notice === 'CANCELED',
    submitting,
    notice,
    complete,
  };
}
