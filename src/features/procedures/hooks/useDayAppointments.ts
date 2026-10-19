import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from 'features/auth';

import { byStartTime, dayBounds, shiftDays } from '../domain/appointmentDay';
import type { AppointmentStatus } from '../domain/procedure.types';
import {
  fetchAppointments,
  type AppointmentResult,
} from '../services/procedureService';

const STATUSES: readonly AppointmentStatus[] = [
  'SCHEDULED',
  'COMPLETED',
  'CANCELED',
];

export type DayAppointmentsState = {
  day: Date;
  appointments: AppointmentResult[];
  status: 'loading' | 'ready' | 'error';
  previousDay: () => void;
  nextDay: () => void;
  refetch: () => void;
};

export function useDayAppointments(): DayAppointmentsState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;
  const [day, setDay] = useState(() => new Date());
  const [appointments, setAppointments] = useState<AppointmentResult[]>([]);
  const [status, setStatus] =
    useState<DayAppointmentsState['status']>('loading');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    if (!idToken) {
      return;
    }
    // Trocar de dia rápido dispara buscas em sequência; só a última vale.
    const id = ++requestId.current;
    setStatus('loading');
    const bounds = dayBounds(day);
    try {
      // O backend filtra um status por vez.
      const pages = await Promise.all(
        STATUSES.map(appointmentStatus =>
          fetchAppointments(idToken, { status: appointmentStatus, ...bounds }),
        ),
      );
      if (id !== requestId.current) return;
      setAppointments(pages.flat().sort(byStartTime));
      setStatus('ready');
    } catch {
      if (id !== requestId.current) return;
      setStatus('error');
    }
  }, [idToken, day]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    day,
    appointments,
    status,
    previousDay: () => setDay(current => shiftDays(current, -1)),
    nextDay: () => setDay(current => shiftDays(current, 1)),
    refetch: load,
  };
}
