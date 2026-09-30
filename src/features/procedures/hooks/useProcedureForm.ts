import { useEffect, useState } from 'react';

import {
  isLocalAppointmentId,
  isNetworkError,
  newClientGeneratedId,
  queueAppointmentCreate,
  queueAppointmentUpdate,
} from 'features/appointments';
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
  readTimeConflict,
  updateAppointment,
  type AppointmentResult,
  type ConflictingAppointment,
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
  const { session, account } = useAuth();
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
  const [conflict, setConflict] = useState<ConflictingAppointment | null>(null);

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
    setConflict(null);
  }

  // Volta ao formulário com o que foi digitado, para trocar o horário.
  function dismissConflict(): void {
    setConflict(null);
  }

  function acceptSupplyPrompt(): void {
    setSupplyPrompt(prev => (prev ? { ...prev, step: 'selector' } : prev));
  }

  // O atendimento já está salvo aqui: recusar ou concluir os insumos só
  // encerra o formulário, não desfaz nada.
  function finishSupplyPrompt(): void {
    const created = supplyPrompt
      ? { startsAt: supplyPrompt.startsAt }
      : undefined;
    setSupplyPrompt(null);
    reset();
    onSuccess(created);
  }

  async function saveEdit(
    idToken: string,
    appointmentId: string,
    changes: Partial<CreateAppointmentPayload>,
  ): Promise<void> {
    // Um agendamento criado offline ainda não existe no backend: a edição
    // entra direto na fila, junto do create dele.
    if (account && isLocalAppointmentId(appointmentId)) {
      await queueAppointmentUpdate(account.id, appointmentId, changes);
      return;
    }
    try {
      await updateAppointment(idToken, appointmentId, changes);
    } catch (error) {
      if (!account || !isNetworkError(error)) throw error;
      await queueAppointmentUpdate(account.id, appointmentId, changes);
    }
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
    setConflict(null);
    try {
      if (editing) {
        const changes: Partial<CreateAppointmentPayload> =
          toCreateAppointmentPayload(values);
        delete changes.status;
        await saveEdit(session.idToken, editing.id, changes);
        onSuccess();
        return;
      }
      const payload = toCreateAppointmentPayload(values);
      // Vai também no envio online: se a resposta se perder e o app tentar
      // de novo pela fila, o backend reconhece o mesmo registro.
      const clientGeneratedId = newClientGeneratedId();
      let appointment: AppointmentResult | null = null;
      try {
        appointment = await createAppointment(session.idToken, {
          ...payload,
          clientGeneratedId,
        });
      } catch (error) {
        if (!account || !isNetworkError(error)) throw error;
      }
      if (!appointment) {
        // Sem rede: fica na fila e aparece na agenda como pendente. Insumos
        // mexem no estoque do backend, então a pergunta fica para o detalhe.
        await queueAppointmentCreate(account!.id, clientGeneratedId, payload);
        reset();
        onSuccess({ startsAt: payload.startsAt });
        return;
      }
      // Insumos são lançados quando o procedimento acontece, não ao agendar.
      if (payload.status === 'SCHEDULED') {
        reset();
        onSuccess({ startsAt: appointment.startsAt });
        return;
      }
      // Os valores só são limpos ao fim da pergunta; a tela esconde o
      // formulário enquanto ela está aberta.
      setSupplyPrompt({
        appointmentId: appointment.id,
        startsAt: appointment.startsAt,
        step: 'confirm',
      });
    } catch (error) {
      const conflicting = readTimeConflict(error);
      if (conflicting) {
        setConflict(conflicting);
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
    client: {
      term: clientSearch.term,
      status: clientSearch.status,
      options: clientSearch.options,
      onTermChange: changeClientTerm,
      onSelect: selectClient,
    },
    supplyPrompt,
    conflict,
    dismissConflict,
    setField,
    setTextField,
    submit,
    reset,
    acceptSupplyPrompt,
    finishSupplyPrompt,
  };
}
