import { useState } from 'react';

import { useAuth } from 'features/auth';

import {
  EMPTY_PROCEDURE_FORM,
  type ProcedureErrors,
  type ProcedureFormValues,
  type ProcedureTextField,
} from '../domain/procedure.types';
import { toCreateAppointmentPayload } from '../domain/toCreateAppointmentPayload';
import { validateProcedureForm } from '../domain/validateProcedureForm';
import { createAppointment } from '../services/procedureService';

export function useProcedureForm(onSuccess: () => void) {
  const { session } = useAuth();
  const [values, setValues] = useState<ProcedureFormValues>(
    EMPTY_PROCEDURE_FORM,
  );
  const [errors, setErrors] = useState<ProcedureErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);

  function setField<K extends keyof ProcedureFormValues>(
    key: K,
    value: ProcedureFormValues[K],
  ): void {
    setValues(prev => ({ ...prev, [key]: value }));
  }

  function setTextField(key: ProcedureTextField, value: string): void {
    setValues(prev => ({ ...prev, [key]: value }));
  }

  function reset(): void {
    setValues(EMPTY_PROCEDURE_FORM);
    setErrors({});
    setSubmitFailed(false);
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
      await createAppointment(
        session.idToken,
        toCreateAppointmentPayload(values),
      );
      reset();
      onSuccess();
    } catch {
      setSubmitFailed(true);
    } finally {
      setSubmitting(false);
    }
  }

  return {
    values,
    errors,
    submitting,
    submitFailed,
    setField,
    setTextField,
    submit,
    reset,
  };
}
