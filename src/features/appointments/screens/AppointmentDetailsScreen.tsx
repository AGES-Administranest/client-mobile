import { CalendarPlus } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { useTranslation } from 'shared/i18n';

import { FeedbackSheet } from '../components/FeedbackSheet';
import { formatAppointmentPeriod } from '../domain/formatAppointmentPeriod';
import { useAppointmentDetails } from '../hooks/useAppointmentDetails';
import { useExportToCalendar } from '../hooks/useExportToCalendar';

type AppointmentDetailsScreenProps = {
  appointmentId: string;
};

export function AppointmentDetailsScreen({
  appointmentId,
}: AppointmentDetailsScreenProps) {
  const { t, locale } = useTranslation();
  const { appointment, isLoading } = useAppointmentDetails(appointmentId);
  const exportState = useExportToCalendar(
    appointment ?? {
      id: appointmentId,
      procedureName: '',
      startsAt: new Date().toISOString(),
      endsAt: new Date().toISOString(),
      client: { name: '' },
    },
  );

  if (isLoading || !appointment) {
    return (
      <View className="flex-1 items-center justify-center bg-background-primary">
        <Text className="text-label-tertiary">{t('appointments.loading')}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 gap-4 bg-background-primary px-4 pt-6">
      <Text className="text-2xl font-bold text-label-primary">
        {appointment.procedureName}
      </Text>
      <Text className="text-[15px] text-label-tertiary">
        {formatAppointmentPeriod(appointment, locale)}
      </Text>

      <View className="gap-1">
        <Text className="text-xs font-bold uppercase tracking-wide text-label-tertiary">
          {t('appointments.clientLabel')}
        </Text>
        <Text className="text-base text-label-primary">
          {appointment.client.name}
        </Text>
      </View>

      {appointment.notes ? (
        <View className="gap-1">
          <Text className="text-xs font-bold uppercase tracking-wide text-label-tertiary">
            {t('appointments.notesLabel')}
          </Text>
          <Text className="text-base text-label-primary">
            {appointment.notes}
          </Text>
        </View>
      ) : null}

      <Button
        shape="pill"
        icon={CalendarPlus}
        className="mt-2"
        disabled={exportState.status === 'exporting'}
        accessibilityRole="button"
        accessibilityLabel={t('appointments.exportToCalendar')}
        onPress={exportState.exportToCalendar}
      >
        <Text className="font-semibold text-label-secondary">
          {t('appointments.exportToCalendar')}
        </Text>
      </Button>

      <FeedbackSheet
        visible={exportState.status === 'success'}
        title={t('appointments.exportSuccessTitle')}
        message={t('appointments.exportSuccess')}
        dismissLabel={t('appointments.dismiss')}
        onDismiss={exportState.reset}
      />
      <FeedbackSheet
        visible={exportState.status === 'permissionDenied'}
        title={t('appointments.exportPermissionDeniedTitle')}
        message={t('appointments.exportPermissionDenied')}
        dismissLabel={t('appointments.dismiss')}
        onDismiss={exportState.reset}
      />
      <FeedbackSheet
        visible={exportState.status === 'error'}
        title={t('appointments.exportErrorTitle')}
        message={t('appointments.exportError')}
        dismissLabel={t('appointments.dismiss')}
        onDismiss={exportState.reset}
      />
    </View>
  );
}
