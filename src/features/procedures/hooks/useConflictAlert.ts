import { useRef } from 'react';

import type { ConflictingAppointment as ConflictAlertAppointment } from 'features/appointments';
import { useTranslation } from 'shared/i18n';

import type { ConflictingAppointment } from '../services/procedureService';

export type ConflictAlertState = {
  visible: boolean;
  conflictingAppointment: ConflictAlertAppointment;
};

// O alerta continua mostrando o último conflito enquanto anima a saída: sem
// isso o texto virava "outro atendimento às " no meio da animação.
export function useConflictAlert(
  conflict: ConflictingAppointment | null,
): ConflictAlertState {
  const { locale } = useTranslation();
  const lastShown = useRef<ConflictAlertAppointment>({
    procedureName: null,
    time: '',
  });

  if (conflict) {
    lastShown.current = {
      procedureName: conflict.procedureName,
      time: new Date(conflict.startsAt).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  }

  return {
    visible: conflict !== null,
    conflictingAppointment: lastShown.current,
  };
}
