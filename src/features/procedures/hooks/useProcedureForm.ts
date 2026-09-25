import { useState } from 'react';

import { useAuth } from 'features/auth';
import {
  useClientSearch,
  type Client,
  type ClientOption,
} from 'features/clients';
import { ApiError } from 'shared/services/apiClient';

import {
  EMPTY_PROCEDURE_FORM,
  type ProcedureErrors,
  type ProcedureFormValues,
  type ProcedureHistoryItem,
  type ProcedureTextField,
} from '../domain/procedure.types';
import { applyFieldMask } from '../domain/procedureMasks';
import {
  toCreateAppointmentPayload,
  toUpdateAppointmentPayload,
} from '../domain/toCreateAppointmentPayload';
import { toProcedureFormValues } from '../domain/toProcedureFormValues';
import { validateProcedureForm } from '../domain/validateProcedureForm';
import {
  createAppointment,
  updateAppointment,
} from '../services/procedureService';

export function useProcedureForm(onSuccess: () => void, visible: boolean) {
  const { session } = useAuth();
  const [values, setValues] =
    useState<ProcedureFormValues>(EMPTY_PROCEDURE_FORM);
  const [errors, setErrors] = useState<ProcedureErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitFailed, setSubmitFailed] = useState(false);
  const [timeConflict, setTimeConflict] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    null,
  );
  // Fica preenchido depois de salvar: o sheet ainda está fechando, e limpar
  // aqui trocaria o título para "Novo atendimento" no meio da animação.
  const [editing, setEditing] = useState<ProcedureHistoryItem | null>(null);
  const clientSearch = useClientSearch({
    active: visible,
    paused: selectedClient !== null,
  });

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
    setTimeConflict(false);
  }

  // Prepara o formulário para abrir. Sem `target` é um cadastro novo: o
  // rascunho continua onde estava, a não ser que venha de uma edição.
  function begin(target: ProcedureHistoryItem | null): void {
    if (target === null) {
      if (editing !== null) {
        reset();
        setEditing(null);
      }
      return;
    }

    const { appointment, clientName } = target;
    // Sem o nome o campo ficaria vazio apontando para um clientId: quem edita
    // um registro antigo (só com `location`) escolhe o tomador de novo.
    const knownClient =
      appointment.clientId !== null && clientName !== null
        ? { id: appointment.clientId, name: clientName }
        : null;

    setValues({
      ...toProcedureFormValues(appointment),
      clientId: knownClient?.id ?? null,
    });
    setSelectedClient(knownClient);
    clientSearch.onTermChange(knownClient?.name ?? '');
    setErrors({});
    setSubmitFailed(false);
    setTimeConflict(false);
    setEditing(target);
  }

  function dismissTimeConflict(): void {
    setTimeConflict(false);
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
        await updateAppointment(
          session.idToken,
          editing.appointment.id,
          toUpdateAppointmentPayload(values),
        );
      } else {
        await createAppointment(
          session.idToken,
          toCreateAppointmentPayload(values),
        );
      }
      reset();
      onSuccess();
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
    isEditing: editing !== null,
    client: {
      term: clientSearch.term,
      status: clientSearch.status,
      options: clientSearch.options,
      onTermChange: changeClientTerm,
      onSelect: selectClient,
      onCreated: selectCreatedClient,
    },
    setField,
    setTextField,
    submit,
    reset,
    begin,
    dismissTimeConflict,
  };
}
