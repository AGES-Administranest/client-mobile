import { useState } from 'react';

import { useAuth } from 'features/auth';
import { ApiError } from 'shared/services/apiClient';

import {
  EMPTY_PROCEDURE_FORM,
  type ProcedureErrors,
  type ProcedureFormValues,
  type ProcedureTextField,
} from '../domain/procedure.types';
import { applyFieldMask } from '../domain/procedureMasks';
import { toCreateAppointmentPayload } from '../domain/toCreateAppointmentPayload';
import { validateProcedureForm } from '../domain/validateProcedureForm';
import { createAppointment } from '../services/procedureService';

type SupplyPrompt = {
  appointmentId: string;
  step: 'confirm' | 'selector';
};

export function useProcedureForm(onSuccess: () => void) {
  const { session } = useAuth();
  const [values, setValues] =
    useState<ProcedureFormValues>(EMPTY_PROCEDURE_FORM);
  const [errors, setErrors] = useState<ProcedureErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [timeConflict, setTimeConflict] = useState(false);
  const [supplyPrompt, setSupplyPrompt] = useState<SupplyPrompt | null>(null);

  function setField<K extends keyof ProcedureFormValues>(
    key: K,
    value: ProcedureFormValues[K],
  ): void {
    setValues(prev => ({ ...prev, [key]: value }));
  }

  function setTextField(key: ProcedureTextField, value: string): void {
    setValues(prev => ({ ...prev, [key]: applyFieldMask(key, value) }));
  }

  function reset(): void {
    setValues(EMPTY_PROCEDURE_FORM);
    setErrors({});
    setSubmitFailed(false);
    setTimeConflict(false);
  }

  function dismissTimeConflict(): void {
    setTimeConflict(false);
  }

  function acceptSupplyPrompt(): void {
    setSupplyPrompt(prev => (prev ? { ...prev, step: 'selector' } : prev));
  }

  // O atendimento já está salvo aqui: recusar ou concluir os insumos só
  // encerra o formulário, não desfaz nada.
  function finishSupplyPrompt(): void {
    setSupplyPrompt(null);
    reset();
    onSuccess();
  }

  async function submit(): Promise<void> {
    const validation = validateProcedureForm(values);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      return;
    }
    if (!session) {
      setSubmitFailed(true);
      return;
    }

    setSubmitting(true);
    setSubmitFailed(false);
    try {
      const appointment = await createAppointment(
        session.idToken,
        toCreateAppointmentPayload(values),
      );
      // Os valores só são limpos ao fim da pergunta; a tela esconde o
      // formulário enquanto ela está aberta.
      setSupplyPrompt({ appointmentId: appointment.id, step: 'confirm' });
    } catch (error) {
      // O Figma também prevê "Confirmar mesmo assim", mas o backend sempre recusa
      // o conflito (não há como forçar). Fica de fora até haver decisão de produto
      // e suporte no backend (parâmetro force).
      if (
        error instanceof ApiError &&
        error.code === 'APPOINTMENT_TIME_CONFLICT'
      ) {
        setTimeConflict(true);
      } else {
        setSubmitFailed(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return {
    values,
    errors,
    submitting,
    submitFailed,
    timeConflict,
    supplyPrompt,
    setField,
    setTextField,
    submit,
    reset,
    dismissTimeConflict,
    acceptSupplyPrompt,
    finishSupplyPrompt,
  };
}
