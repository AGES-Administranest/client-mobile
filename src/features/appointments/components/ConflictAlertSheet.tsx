import { Clock } from 'lucide-react-native';

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
  onAdjust: () => void;
};

// O backend recusa o horário em conflito (409), então não há "salvar mesmo
// assim": a única saída é voltar ao formulário e alterar o horário — pelo
// botão, tocando fora ou arrastando a folha para baixo.
function ConflictAlertSheet({
  visible,
  conflictingAppointment,
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
      confirmLabel={t('appointments.conflict.adjust')}
      confirmIcon={Clock}
      onConfirm={onAdjust}
      onCancel={onAdjust}
    />
  );
}

export { ConflictAlertSheet };
export type { ConflictAlertSheetProps, ConflictingAppointment };
