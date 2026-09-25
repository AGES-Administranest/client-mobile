import { useEffect, useState } from 'react';

import type { Appointment } from '../domain/appointment';
import { fetchAppointment } from '../services/appointmentService';

export type AppointmentDetailsState = {
  appointment: Appointment | null;
  isLoading: boolean;
};

export function useAppointmentDetails(id: string): AppointmentDetailsState {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    fetchAppointment(id).then(result => {
      if (!isMounted) return;
      setAppointment(result);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [id]);

  return { appointment, isLoading };
}
