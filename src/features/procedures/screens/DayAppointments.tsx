import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { useTranslation, type TranslationKey } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';

import { AppointmentDetailScreen } from './AppointmentDetailScreen';
import type { AppointmentStatus } from '../domain/procedure.types';
import { useDayAppointments } from '../hooks/useDayAppointments';

type DayAppointmentsProps = {
  /** Muda quando um atendimento é criado fora daqui, pedindo nova busca. */
  refreshKey: number;
};

const STATUS_TEXT: Record<AppointmentStatus, string> = {
  SCHEDULED: 'text-label-primary',
  COMPLETED: 'text-label-tertiary',
  CANCELED: 'text-label-tertiary line-through',
};

export function DayAppointments({ refreshKey }: DayAppointmentsProps) {
  const { t, locale } = useTranslation();
  const day = useDayAppointments();
  const [openId, setOpenId] = useState<string | null>(null);
  const { refetch } = day;

  useEffect(() => {
    if (refreshKey > 0) {
      refetch();
    }
  }, [refreshKey, refetch]);

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <View className="flex-1 gap-3">
      <View className="flex-row items-center justify-between px-4">
        <Pressable
          onPress={day.previousDay}
          accessibilityRole="button"
          accessibilityLabel={t('procedures.day.previous')}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center"
        >
          <Icon as={ChevronLeft} className="size-6 text-label-primary" />
        </Pressable>
        <Text className="text-base font-semibold capitalize text-label-primary">
          {day.day.toLocaleDateString(locale, {
            weekday: 'long',
            day: '2-digit',
            month: 'short',
          })}
        </Text>
        <Pressable
          onPress={day.nextDay}
          accessibilityRole="button"
          accessibilityLabel={t('procedures.day.next')}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center"
        >
          <Icon as={ChevronRight} className="size-6 text-label-primary" />
        </Pressable>
      </View>

      <ScrollView contentContainerClassName="gap-3 px-4 pb-28">
        {day.status === 'error' ? (
          <Text className="py-8 text-center text-sm text-label-tertiary">
            {t('procedures.day.error')}
          </Text>
        ) : day.status === 'ready' && day.appointments.length === 0 ? (
          <Text className="py-8 text-center text-sm text-label-tertiary">
            {t('procedures.day.empty')}
          </Text>
        ) : (
          day.appointments.map(appointment => (
            <Pressable
              key={appointment.id}
              onPress={() => setOpenId(appointment.id)}
              accessibilityRole="button"
              className="flex-row items-center gap-3 rounded-2xl bg-white p-4 active:opacity-80"
            >
              <Text className="w-12 text-sm font-semibold text-label-primary">
                {time(appointment.startsAt)}
              </Text>
              <View className="flex-1 gap-1">
                <Text
                  className="text-base font-medium text-label-primary"
                  numberOfLines={1}
                >
                  {appointment.patientName ?? t('procedures.day.untitled')}
                </Text>
                <Text className="text-xs text-label-tertiary" numberOfLines={1}>
                  {appointment.procedureName ?? ''}
                </Text>
              </View>
              <View className="items-end gap-1">
                <Text
                  className={cn(
                    'text-xs font-semibold',
                    STATUS_TEXT[appointment.status],
                  )}
                >
                  {t(
                    `procedures.status.${appointment.status}` as TranslationKey,
                  )}
                </Text>
                {appointment.amount !== null ? (
                  <Text className="text-xs text-label-primary">
                    {formatCurrency(
                      Number.parseFloat(appointment.amount),
                      locale,
                    )}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <AppointmentDetailScreen
        appointmentId={openId}
        onClose={() => setOpenId(null)}
        onChanged={refetch}
      />
    </View>
  );
}
