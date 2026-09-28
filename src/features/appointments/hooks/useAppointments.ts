import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from 'features/auth';
import { addMonths, toCalendarDate } from 'shared/utils/calendar';

import {
  groupAppointmentsByDate,
  type Appointment,
  type AppointmentStatus,
} from '../domain/appointment';
import { fetchAppointments } from '../services/appointmentService';

export type AppointmentsState = {
  year: number;
  monthIndex: number;
  monthString: string; // YYYY-MM
  selectedDate: string; // YYYY-MM-DD
  appointments: Appointment[];
  appointmentsByDate: Record<string, Appointment[]>;
  selectedDayAppointments: Appointment[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  onSelectDate: (date: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onRefresh: () => Promise<void>;
};

const STATUSES: readonly AppointmentStatus[] = [
  'SCHEDULED',
  'COMPLETED',
  'CANCELED',
];

// The API filters one status at a time; completed and canceled appointments
// stay on the agenda, so the month is the three lists together.
async function fetchMonth(
  idToken: string,
  month: string,
): Promise<Appointment[]> {
  const pages = await Promise.all(
    STATUSES.map(status => fetchAppointments(idToken, { month, status })),
  );
  return pages.flat();
}

export function useAppointments(): AppointmentsState {
  const { session } = useAuth();
  const idToken = session?.idToken ?? null;

  const today = useMemo(() => new Date(), []);
  const todayDateString = useMemo(() => toCalendarDate(today), [today]);

  const [visibleDate, setVisibleDate] = useState({
    year: today.getFullYear(),
    monthIndex: today.getMonth(),
  });

  const [selectedDate, setSelectedDate] = useState<string>(todayDateString);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const monthString = useMemo(() => {
    const month = String(visibleDate.monthIndex + 1).padStart(2, '0');
    return `${visibleDate.year}-${month}`;
  }, [visibleDate.year, visibleDate.monthIndex]);

  const loadAppointments = useCallback(
    async (isPullToRefresh = false) => {
      if (isPullToRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        setAppointments(await fetchMonth(idToken ?? '', monthString));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao buscar agendamentos';
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [idToken, monthString],
  );

  useEffect(() => {
    let isMounted = true;

    async function execute() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchMonth(idToken ?? '', monthString);
        if (isMounted) {
          setAppointments(data);
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err instanceof Error ? err.message : 'Erro ao buscar agendamentos';
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    execute();

    return () => {
      isMounted = false;
    };
  }, [idToken, monthString]);

  const appointmentsByDate = useMemo(() => {
    return groupAppointmentsByDate(appointments);
  }, [appointments]);

  const selectedDayAppointments = useMemo(() => {
    return appointmentsByDate[selectedDate] ?? [];
  }, [appointmentsByDate, selectedDate]);

  const onPreviousMonth = useCallback(() => {
    setVisibleDate(current => {
      const next = addMonths(current.year, current.monthIndex, -1);
      const nextMonthStr = String(next.monthIndex + 1).padStart(2, '0');
      // Set selected date to 1st of that month if not currently in it
      setSelectedDate(`${next.year}-${nextMonthStr}-01`);
      return next;
    });
  }, []);

  const onNextMonth = useCallback(() => {
    setVisibleDate(current => {
      const next = addMonths(current.year, current.monthIndex, 1);
      const nextMonthStr = String(next.monthIndex + 1).padStart(2, '0');
      setSelectedDate(`${next.year}-${nextMonthStr}-01`);
      return next;
    });
  }, []);

  // A date outside the visible month (the day list's arrows can cross into
  // one) brings its month into view.
  const onSelectDate = useCallback((date: string) => {
    const [year, month] = date.split('-').map(Number);
    setSelectedDate(date);
    setVisibleDate(current =>
      current.year === year && current.monthIndex === month - 1
        ? current
        : { year, monthIndex: month - 1 },
    );
  }, []);

  const onRefresh = useCallback(async () => {
    await loadAppointments(true);
  }, [loadAppointments]);

  return {
    year: visibleDate.year,
    monthIndex: visibleDate.monthIndex,
    monthString,
    selectedDate,
    appointments,
    appointmentsByDate,
    selectedDayAppointments,
    isLoading,
    isRefreshing,
    error,
    onSelectDate,
    onPreviousMonth,
    onNextMonth,
    onRefresh,
  };
}
