import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { useTranslation } from 'shared/i18n';

// Matches the backend's ConflictingAppointmentEntity (appointments module):
// no location/clinic field exists on Appointment.
type ConflictingAppointment = {
  procedureName: string | null;
  time: string;
};

type ConflictAlertSheetProps = {
  visible: boolean;
  conflictingAppointment: ConflictingAppointment;
  onConfirm: () => void;
  onAdjust: () => void;
};

function ConflictAlertSheet({
  visible,
  conflictingAppointment,
  onConfirm,
  onAdjust,
}: ConflictAlertSheetProps) {
  const { t } = useTranslation();

  return (
    <ConfirmSheet
      visible={visible}
      title={t('appointments.conflict.title')}
      message={t('appointments.conflict.message', {
        procedure:
          conflictingAppointment.procedureName ??
          t('appointments.conflict.unnamedProcedure'),
        time: conflictingAppointment.time,
      })}
      confirmLabel={t('appointments.conflict.confirm')}
      cancelLabel={t('appointments.conflict.adjust')}
      onConfirm={onConfirm}
      onCancel={onAdjust}
    />
  );
}

export { ConflictAlertSheet };
export type { ConflictAlertSheetProps, ConflictingAppointment };
