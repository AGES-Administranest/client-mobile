import { useCallback, useEffect, useRef, useState } from 'react';

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
  fetchAppointment,
  updateAppointmentAmount,
  type AppointmentResult,
} from '../services/procedureService';

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
};

export function useAppointmentDetail(
  appointmentId: string | null,
): AppointmentDetailState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
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
    try {
      const [fresh, saved] = await Promise.all([
        fetchAppointment(idToken, appointmentId),
        fetchAppointmentSupplies(idToken, appointmentId),
      ]);
      if (currentId.current !== appointmentId) return;
      setAppointment(fresh);
      setSupplies(saved.map(toSupplyItem));
      setStatus('ready');
    } catch {
      if (currentId.current !== appointmentId) return;
      setStatus('error');
    }
  }, [idToken, appointmentId]);

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
  };
}
