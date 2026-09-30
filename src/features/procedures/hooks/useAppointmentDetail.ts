import { useCallback, useEffect, useRef, useState } from 'react';

import {
  discardOfflineAppointment,
  findOfflineAppointment,
  isLocalAppointmentId,
  isNetworkError,
  resolveLocalAppointmentId,
  type Appointment,
} from 'features/appointments';
import { useAuth } from 'features/auth';

import { toSupplyItem } from '../domain/appointmentSupply';
import { parseDecimal } from '../domain/parseDecimal';
import type { SupplyItem } from '../domain/supplyItem';
import {
  fetchAppointmentSupplies,
  registerAppointmentSupplies,
  removeAppointmentSupply,
} from '../services/appointmentSupplyService';
import {
  deleteAppointment,
  fetchAppointment,
  updateAppointmentAmount,
  type AppointmentResult,
} from '../services/procedureService';

function toAppointmentResult(appointment: Appointment): AppointmentResult {
  return {
    id: appointment.id,
    clientId: appointment.clientId ?? null,
    procedureName: appointment.procedureName ?? null,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt ?? null,
    location: appointment.location ?? null,
    amount: appointment.amount == null ? null : String(appointment.amount),
    patientName: appointment.patientName ?? null,
    ownerName: appointment.ownerName ?? null,
    species: (appointment.species ?? null) as AppointmentResult['species'],
    patientAgeYears: appointment.patientAgeYears ?? null,
    weightKg:
      appointment.weightKg == null ? null : String(appointment.weightKg),
    asa: appointment.asa ?? null,
    notes: appointment.notes ?? null,
    status: appointment.status,
    createdAt: appointment.createdAt ?? '',
    updatedAt: appointment.updatedAt ?? '',
    deletedAt: null,
  };
}

export type AmountError = 'REQUIRED' | 'INVALID_NUMBER' | 'FAILED';

export type AppointmentDetailState = {
  appointment: AppointmentResult | null;
  supplies: SupplyItem[];
  status: 'loading' | 'ready' | 'error';
  /**
   * Criado offline e ainda na fila: não existe no backend, então insumos,
   * valor e mudanças de status esperam o envio.
   */
  pendingSync: boolean;
  supplyFailed: boolean;
  savingSupply: boolean;
  refetch: () => void;
  addSupply: (itemId: string, quantity: number) => Promise<boolean>;
  removeSupply: (movementId: string) => Promise<void>;
  saveAmount: (text: string) => Promise<AmountError | null>;
  remove: () => Promise<boolean>;
};

export function useAppointmentDetail(
  appointmentId: string | null,
): AppointmentDetailState {
  const { session, account } = useAuth();
  const idToken = session?.idToken ?? null;
  const userId = account?.id ?? null;
  const [appointment, setAppointment] = useState<AppointmentResult | null>(
    null,
  );
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [status, setStatus] =
    useState<AppointmentDetailState['status']>('loading');
  const [supplyFailed, setSupplyFailed] = useState(false);
  const [savingSupply, setSavingSupply] = useState(false);
  // Resposta de um atendimento anterior não pode sobrescrever o atual.
  const currentId = useRef(appointmentId);
  currentId.current = appointmentId;
  // O id que vai para o backend: o do próprio atendimento ou, se ele foi
  // criado offline e já sincronizou, o id real no lugar do local.
  const [serverId, setServerId] = useState(appointmentId);
  const pendingSync = serverId !== null && isLocalAppointmentId(serverId);

  const load = useCallback(async () => {
    if (!idToken || !appointmentId) {
      return;
    }
    // Sem rede (ou criado offline e ainda sem id do backend), o detalhe vem
    // do que está salvo no aparelho. Insumos não são guardados offline.
    const loadOffline = async (): Promise<boolean> => {
      const saved = userId
        ? await findOfflineAppointment(userId, appointmentId)
        : null;
      if (!saved || currentId.current !== appointmentId) return false;
      setAppointment(toAppointmentResult(saved));
      setSupplies([]);
      setStatus('ready');
      return true;
    };
    // A tela pode continuar com o id local depois que a fila enviou o
    // agendamento: aí ele já não está na fila e vem do backend pelo id real.
    const resolved =
      userId && isLocalAppointmentId(appointmentId)
        ? await resolveLocalAppointmentId(userId, appointmentId)
        : null;
    if (currentId.current !== appointmentId) return;
    setServerId(resolved ?? appointmentId);
    if (isLocalAppointmentId(appointmentId) && !resolved) {
      if (!(await loadOffline()) && currentId.current === appointmentId) {
        setStatus('error');
      }
      return;
    }
    const targetId = resolved ?? appointmentId;
    try {
      const [fresh, saved] = await Promise.all([
        fetchAppointment(idToken, targetId),
        fetchAppointmentSupplies(idToken, targetId),
      ]);
      if (currentId.current !== appointmentId) return;
      setAppointment(fresh);
      setSupplies(saved.map(toSupplyItem));
      setStatus('ready');
    } catch (error) {
      if (currentId.current !== appointmentId) return;
      if (isNetworkError(error) && (await loadOffline())) return;
      setStatus('error');
    }
  }, [idToken, userId, appointmentId]);

  useEffect(() => {
    setAppointment(null);
    setSupplies([]);
    setSupplyFailed(false);
    setStatus('loading');
    load();
  }, [load]);

  async function changeSupplies(
    change: (token: string, id: string) => Promise<void>,
  ): Promise<boolean> {
    if (!idToken || !appointmentId || !serverId || pendingSync) {
      setSupplyFailed(true);
      return false;
    }
    setSavingSupply(true);
    setSupplyFailed(false);
    try {
      await change(idToken, serverId);
      const saved = await fetchAppointmentSupplies(idToken, serverId);
      if (currentId.current === appointmentId) {
        setSupplies(saved.map(toSupplyItem));
      }
      return true;
    } catch {
      setSupplyFailed(true);
      return false;
    } finally {
      setSavingSupply(false);
    }
  }

  function addSupply(itemId: string, quantity: number): Promise<boolean> {
    return changeSupplies((token, id) =>
      registerAppointmentSupplies(token, id, [{ itemId, quantity }]),
    );
  }

  async function removeSupply(movementId: string): Promise<void> {
    await changeSupplies((token, id) =>
      removeAppointmentSupply(token, id, movementId),
    );
  }

  async function saveAmount(text: string): Promise<AmountError | null> {
    if (text.trim() === '') {
      return 'REQUIRED';
    }
    const amount = parseDecimal(text);
    if (amount === null || amount < 0) {
      return 'INVALID_NUMBER';
    }
    if (!idToken || !appointmentId || !serverId || pendingSync) {
      return 'FAILED';
    }
    try {
      const updated = await updateAppointmentAmount(idToken, serverId, amount);
      if (currentId.current === appointmentId) {
        setAppointment(updated);
      }
      return null;
    } catch {
      return 'FAILED';
    }
  }

  async function remove(): Promise<boolean> {
    if (!idToken || !serverId) {
      return false;
    }
    try {
      // Ainda na fila: excluir é só tirá-lo de lá.
      if (pendingSync) {
        if (!userId) return false;
        await discardOfflineAppointment(userId, serverId);
        return true;
      }
      await deleteAppointment(idToken, serverId);
      return true;
    } catch {
      return false;
    }
  }

  return {
    appointment,
    supplies,
    status,
    pendingSync,
    supplyFailed,
    savingSupply,
    refetch: load,
    addSupply,
    removeSupply,
    saveAmount,
    remove,
  };
}
