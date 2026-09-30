import { useCallback, useEffect, useRef, useState } from 'react';

import {
  findOfflineAppointment,
  isLocalAppointmentId,
  isNetworkError,
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
    if (isLocalAppointmentId(appointmentId)) {
      if (!(await loadOffline()) && currentId.current === appointmentId) {
        setStatus('error');
      }
      return;
    }
    try {
      const [fresh, saved] = await Promise.all([
        fetchAppointment(idToken, appointmentId),
        fetchAppointmentSupplies(idToken, appointmentId),
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
    if (!idToken || !appointmentId) {
      setSupplyFailed(true);
      return false;
    }
    setSavingSupply(true);
    setSupplyFailed(false);
    try {
      await change(idToken, appointmentId);
      const saved = await fetchAppointmentSupplies(idToken, appointmentId);
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
    if (!idToken || !appointmentId) {
      return 'FAILED';
    }
    try {
      const updated = await updateAppointmentAmount(
        idToken,
        appointmentId,
        amount,
      );
      if (currentId.current === appointmentId) {
        setAppointment(updated);
      }
      return null;
    } catch {
      return 'FAILED';
    }
  }

  async function remove(): Promise<boolean> {
    if (!idToken || !appointmentId) {
      return false;
    }
    try {
      await deleteAppointment(idToken, appointmentId);
      return true;
    } catch {
      return false;
    }
  }

  return {
    appointment,
    supplies,
    status,
    supplyFailed,
    savingSupply,
    refetch: load,
    addSupply,
    removeSupply,
    saveAmount,
    remove,
  };
}
