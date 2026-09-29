import { useEffect, useState } from 'react';

import { useAuth } from 'features/auth';
import { useClientSearch, type ClientOption } from 'features/clients';

import {
  EMPTY_PROCEDURE_FORM,
  type CreateAppointmentPayload,
  type ProcedureErrors,
  type ProcedureFormValues,
  type ProcedureTextField,
} from '../domain/procedure.types';
import { applyFieldMask } from '../domain/procedureMasks';
import { toCreateAppointmentPayload } from '../domain/toCreateAppointmentPayload';
import { toProcedureFormValues } from '../domain/toProcedureFormValues';
import { validateProcedureForm } from '../domain/validateProcedureForm';
import {
  createAppointment,
  updateAppointment,
  type AppointmentResult,
} from '../services/procedureService';

type SupplyPrompt = {
  appointmentId: string;
  startsAt: string;
  step: 'confirm' | 'selector';
};

// Com `editing`, o formulário abre preenchido e o envio faz PATCH em vez de POST.
export function useProcedureForm(
  // `created` só vem na criação: a tela usa para levar a agenda ao dia novo.
  onSuccess: (created?: { startsAt: string }) => void,
  visible: boolean,
  editing: AppointmentResult | null = null,
) {
  const { session } = useAuth();
  const [values, setValues] =
    useState<ProcedureFormValues>(EMPTY_PROCEDURE_FORM);
  const [errors, setErrors] = useState<ProcedureErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    null,
  );
  const clientSearch = useClientSearch({
    active: visible,
    paused: selectedClient !== null,
  });
  const [supplyPrompt, setSupplyPrompt] = useState<SupplyPrompt | null>(null);

  useEffect(() => {
    if (!visible || !editing) {
      return;
    }
    setValues(toProcedureFormValues(editing));
    if (editing.clientId && editing.ownerName) {
      setSelectedClient({ id: editing.clientId, name: editing.ownerName });
      clientSearch.onTermChange(editing.ownerName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, editing?.id]);

  function setField<K extends keyof ProcedureFormValues>(
    key: K,
    value: ProcedureFormValues[K],
  ): void {
    setValues(prev => ({ ...prev, [key]: value }));
  }

  function setTextField(key: ProcedureTextField, value: string): void {
    setValues(prev => ({ ...prev, [key]: applyFieldMask(key, value) }));
  }

  function selectClient(client: ClientOption): void {
    setSelectedClient({ id: client.id, name: client.name });
    setField('clientId', client.id);
    setErrors(prev => {
      const next = { ...prev };
      delete next.clientId;
      return next;
    });
    clientSearch.onTermChange(client.name);
  }

  // Digitar de novo desfaz a escolha: o clientId não pode continuar
  // apontando para um tomador que o campo já não mostra.
  function changeClientTerm(term: string): void {
    if (selectedClient !== null) {
      setSelectedClient(null);
      setField('clientId', null);
    }
    clientSearch.onTermChange(term);
  }

  function reset(): void {
    setValues(EMPTY_PROCEDURE_FORM);
    setSelectedClient(null);
    clientSearch.reset();
    setErrors({});
    setSubmitFailed(false);
  }

  function acceptSupplyPrompt(): void {
    setSupplyPrompt(prev => (prev ? { ...prev, step: 'selector' } : prev));
  }

  // O atendimento já está salvo aqui: recusar ou concluir os insumos só
  // encerra o formulário, não desfaz nada.
  function finishSupplyPrompt(): void {
    const created = supplyPrompt ? { startsAt: supplyPrompt.startsAt } : undefined;
    setSupplyPrompt(null);
    reset();
    onSuccess(created);
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
      if (editing) {
        const changes: Partial<CreateAppointmentPayload> =
          toCreateAppointmentPayload(values);
        delete changes.status;
        await updateAppointment(session.idToken, editing.id, changes);
        onSuccess();
        return;
      }
      const appointment = await createAppointment(
        session.idToken,
        toCreateAppointmentPayload(values),
      );
      // Os valores só são limpos ao fim da pergunta; a tela esconde o
      // formulário enquanto ela está aberta.
      setSupplyPrompt({
        appointmentId: appointment.id,
        startsAt: appointment.startsAt,
        step: 'confirm',
      });
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
    client: {
      term: clientSearch.term,
      status: clientSearch.status,
      options: clientSearch.options,
      onTermChange: changeClientTerm,
      onSelect: selectClient,
    },
    supplyPrompt,
    setField,
    setTextField,
    submit,
    reset,
    acceptSupplyPrompt,
    finishSupplyPrompt,
  };
}
