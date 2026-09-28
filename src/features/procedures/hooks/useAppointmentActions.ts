import { useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import {
  resolveCancellationReason,
  type CancellationReasonLabels,
  type CancellationReasonPreset,
} from '../domain/cancellationReasonPresets';
import type { AppointmentStatus } from '../domain/procedure.types';
import { toCancellationOutcome } from '../domain/toCancellationOutcome';
import {
  toCompletionOutcome,
  type AppointmentActionNotice,
  type CompletionErrorInfo,
} from '../domain/toCompletionOutcome';
import {
  validateCancellationReason,
  type CancellationReasonError,
} from '../domain/validateCancellationReason';
import {
  cancelAppointment,
  completeAppointment,
} from '../services/procedureService';

export type ActionableAppointment = {
  id: string;
  status: AppointmentStatus;
};

export type CancellationState = {
  sheetVisible: boolean;
  preset: CancellationReasonPreset | null;
  reason: string;
  reasonError: CancellationReasonError | null;
  failed: boolean;
  open: () => void;
  close: () => void;
  setPreset: (preset: CancellationReasonPreset) => void;
  setReason: (reason: string) => void;
  confirm: (labels: CancellationReasonLabels) => Promise<void>;
};

export type AppointmentActionsState = {
  visible: boolean;
  submitting: boolean;
  notice: AppointmentActionNotice | null;
  justCanceled: boolean;
  complete: () => Promise<void>;
  cancellation: CancellationState;
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
  const [sheetVisible, setSheetVisible] = useState(false);
  const [preset, setPresetValue] = useState<CancellationReasonPreset | null>(
    null,
  );
  const [reason, setReasonValue] = useState('');
  const [reasonError, setReasonError] =
    useState<CancellationReasonError | null>(null);
  const [cancelFailed, setCancelFailed] = useState(false);
  const [justCanceled, setJustCanceled] = useState(false);
  // Uma trava para as duas ações: finalizar e cancelar o mesmo agendamento
  // ao mesmo tempo não faz sentido, e o backend recusaria uma delas.
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
    setSheetVisible(false);
    setPresetValue(null);
    setReasonValue('');
    setReasonError(null);
    setCancelFailed(false);
    setJustCanceled(false);
  }, [appointment.id]);

  async function run(action: (idToken: string) => Promise<void>) {
    if (!session) {
      return false;
    }
    inFlight.current = true;
    setSubmitting(true);
    try {
      await action(session.idToken);
    } finally {
      inFlight.current = false;
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
    return true;
  }

  async function complete(): Promise<void> {
    if (inFlight.current) {
      return;
    }
    setNotice(null);
    const ran = await run(async idToken => {
      try {
        // Corpo vazio: os dados são editados antes, pelo lápis, e o backend
        // usa o valor salvo no agendamento.
        await completeAppointment(idToken, appointment.id, {});
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
      }
    });
    if (!ran) {
      setNotice('FAILED');
    }
  }

  function closeSheet(): void {
    setSheetVisible(false);
    setPresetValue(null);
    setReasonValue('');
    setReasonError(null);
    setCancelFailed(false);
  }

  function openCancel(): void {
    if (inFlight.current) {
      return;
    }
    setNotice(null);
    setSheetVisible(true);
  }

  // Fechar enquanto o cancelamento está em andamento esconderia o resultado.
  function closeCancel(): void {
    if (inFlight.current) {
      return;
    }
    closeSheet();
  }

  function setPreset(value: CancellationReasonPreset): void {
    setPresetValue(value);
    if (value !== 'other') {
      setReasonValue('');
    }
    setReasonError(null);
    setCancelFailed(false);
  }

  function setReason(value: string): void {
    setReasonValue(value);
    setReasonError(null);
    setCancelFailed(false);
  }

  async function confirmCancel(
    labels: CancellationReasonLabels,
  ): Promise<void> {
    if (inFlight.current) {
      return;
    }
    const resolved = resolveCancellationReason(preset, reason, labels);
    const validation = validateCancellationReason(resolved);
    setReasonError(validation);
    if (validation !== null) {
      return;
    }
    setCancelFailed(false);
    const ran = await run(async idToken => {
      try {
        await cancelAppointment(idToken, appointment.id, resolved.trim());
        if (isMounted.current) {
          closeSheet();
          setJustCanceled(true);
          onChanged();
        }
      } catch (error) {
        if (!isMounted.current) {
          return;
        }
        const outcome = toCancellationOutcome(toErrorInfo(error));
        if (outcome === 'CANCELED') {
          closeSheet();
          setJustCanceled(true);
          onChanged();
        } else if (outcome === 'COMPLETED') {
          closeSheet();
          setNotice('COMPLETED');
          onChanged();
        } else if (outcome === 'NOT_FOUND') {
          closeSheet();
          setNotice('CANCEL_FAILED');
          onChanged();
        } else {
          // A folha fica aberta com o motivo digitado, para tentar de novo.
          setCancelFailed(true);
        }
      }
    });
    if (!ran) {
      setCancelFailed(true);
    }
  }

  return {
    // Os avisos de "já cancelado" e "já finalizado" continuam na tela depois
    // que a busca de novo traz o status novo; sem isso sumiriam com os botões.
    visible:
      appointment.status === 'SCHEDULED' ||
      notice === 'CANCELED' ||
      notice === 'COMPLETED',
    submitting,
    notice,
    justCanceled,
    complete,
    cancellation: {
      sheetVisible,
      preset,
      reason,
      reasonError,
      failed: cancelFailed,
      open: openCancel,
      close: closeCancel,
      setPreset,
      setReason,
      confirm: confirmCancel,
    },
  };
}
