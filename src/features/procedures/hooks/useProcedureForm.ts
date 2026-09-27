import { useState } from 'react';

import { useAuth } from 'features/auth';
import {
  useClientSearch,
  type Client,
  type ClientOption,
} from 'features/clients';

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

export function useProcedureForm(onSuccess: () => void, visible: boolean) {
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

  function selectCreatedClient(created: Client): void {
    clientSearch.addCreated(created);
    selectClient(created);
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
      onCreated: selectCreatedClient,
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
