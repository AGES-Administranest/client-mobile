import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { useTranslation } from 'shared/i18n';

type ConflictingAppointment = {
  procedure: string;
  time: string;
  location: string;
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
      message={t('appointments.conflict.message', conflictingAppointment)}
      confirmLabel={t('appointments.conflict.confirm')}
      cancelLabel={t('appointments.conflict.adjust')}
      onConfirm={onConfirm}
      onCancel={onAdjust}
    />
  );
}

export { ConflictAlertSheet };
export type { ConflictAlertSheetProps, ConflictingAppointment };
