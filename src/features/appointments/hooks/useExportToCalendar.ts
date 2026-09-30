import { useCallback, useState } from 'react';

import {
  toCalendarEventInput,
  type ExportableAppointment,
} from '../domain/calendarEvent';
import {
  addAppointmentToCalendar,
  requestCalendarPermission,
} from '../services/calendarService';

export type ExportToCalendarStatus =
  | 'idle'
  | 'exporting'
  | 'success'
  | 'permissionDenied'
  | 'error';

export type ExportToCalendarState = {
  status: ExportToCalendarStatus;
  exportToCalendar: () => Promise<void>;
  reset: () => void;
};

export function useExportToCalendar(
  appointment: ExportableAppointment,
): ExportToCalendarState {
  const [status, setStatus] = useState<ExportToCalendarStatus>('idle');

  const exportToCalendar = useCallback(async () => {
    setStatus('exporting');

    try {
      const permission = await requestCalendarPermission();
      if (permission !== 'granted') {
        setStatus('permissionDenied');
        return;
      }

      await addAppointmentToCalendar(toCalendarEventInput(appointment));
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }, [appointment]);

  const reset = useCallback(() => setStatus('idle'), []);

  return { status, exportToCalendar, reset };
}
