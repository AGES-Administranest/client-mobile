import { useTranslation } from 'shared/i18n';

import { FeedbackSheet } from '../components/FeedbackSheet';
import type { SyncRejection } from '../domain/offlineAppointments';
import { useAppointmentSync } from '../hooks/useAppointmentSync';

function reasonKey(code: string | null) {
  switch (code) {
    case 'APPOINTMENT_TIME_CONFLICT':
      return 'appointments.sync.reasons.conflict' as const;
    case 'APPOINTMENT_NOT_FOUND':
      return 'appointments.sync.reasons.notFound' as const;
    default:
      return 'appointments.sync.reasons.other' as const;
  }
}

/**
 * Envia os agendamentos criados ou editados sem conexão assim que der, e
 * avisa quando o backend recusa algum (um conflito com outro agendamento
 * feito em outro aparelho, por exemplo): sem o aviso ele sumiria da agenda
 * sem explicação.
 */
export function AppointmentSyncObserver() {
  const { t, locale } = useTranslation();
  const { rejection, dismissRejection } = useAppointmentSync();

  function describe(item: SyncRejection): string {
    const fields =
      item.operation.kind === 'create'
        ? item.operation.payload
        : item.operation.changes;
    const reason = t(reasonKey(item.code));
    if (!fields.startsAt) {
      return t('appointments.sync.messageEdit', { reason });
    }
    const startsAt = new Date(fields.startsAt);
    return t('appointments.sync.message', {
      patient: fields.patientName ?? t('appointments.sync.unnamedPatient'),
      date: startsAt.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
      }),
      time: startsAt.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      }),
      reason,
    });
  }

  return (
    <FeedbackSheet
      visible={rejection !== null}
      title={t('appointments.sync.title')}
      message={rejection ? describe(rejection) : ''}
      dismissLabel={t('appointments.dismiss')}
      onDismiss={dismissRejection}
    />
  );
}
