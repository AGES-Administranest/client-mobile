import { ConfirmDialog } from 'app/components/ui/confirm-dialog';
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
  onAdjust: () => void;
};

// Abre por cima da folha do formulário, então é um ConfirmDialog e não um
// ConfirmSheet: folha sobre folha deixa ambíguo qual está em foco (DESIGN.md).
//
// Só há "Ajustar horário": salvar mesmo com conflito ("Confirmar") depende de
// o backend aceitar forçar a gravação, o que ele ainda não faz.
function ConflictAlertSheet({
  visible,
  conflictingAppointment,
  onAdjust,
}: ConflictAlertSheetProps) {
  const { t } = useTranslation();

  return (
    <ConfirmDialog
      visible={visible}
      title={t('appointments.conflict.title')}
      message={t('appointments.conflict.message', {
        procedure:
          conflictingAppointment.procedureName ??
          t('appointments.conflict.unnamedProcedure'),
        time: conflictingAppointment.time,
      })}
      confirmLabel={t('appointments.conflict.adjust')}
      onConfirm={onAdjust}
      onCancel={onAdjust}
    />
  );
}

export { ConflictAlertSheet };
export type { ConflictAlertSheetProps, ConflictingAppointment };
