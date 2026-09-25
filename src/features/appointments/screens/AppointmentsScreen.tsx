import { ArrowLeft, Plus } from 'lucide-react-native';
import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { fromCalendarDate } from 'shared/utils/calendar';

import { AppointmentCalendar } from '../components/AppointmentCalendar';
import { AppointmentDayList } from '../components/AppointmentDayList';
import type { Appointment, Species } from '../domain/appointment';
import { useAppointments } from '../hooks/useAppointments';

const FIRST_SUNDAY = new Date(2024, 0, 7);
const WEEK_LENGTH = 7;

export type AppointmentsScreenProps = {
  header?: React.ReactNode;
  onBack?: () => void;
  onSelectAppointment?: (appointment: Appointment) => void;
  controller?: ReturnType<typeof useAppointments>;
};

export function AppointmentsScreen({
  header,
  onBack,
  onSelectAppointment,
  controller,
}: AppointmentsScreenProps) {
  const { t, locale } = useTranslation();
  const internalController = useAppointments();

  const {
    year,
    monthIndex,
    selectedDate,
    appointmentsByDate,
    selectedDayAppointments,
    isLoading,
    isRefreshing,
    error,
    onSelectDate,
    onPreviousMonth,
    onNextMonth,
    onRefresh,
  } = controller ?? internalController;

  // Formato do label do mês: "Agosto 2026" (conforme mockup)
  const monthLabel = useMemo(() => {
    try {
      const monthName = new Intl.DateTimeFormat(locale, {
        month: 'long',
      }).format(new Date(year, monthIndex, 1));
      const capitalized =
        monthName.charAt(0).toUpperCase() + monthName.slice(1);
      return `${capitalized} ${year}`;
    } catch {
      return `${year}-${monthIndex + 1}`;
    }
  }, [locale, year, monthIndex]);

  // Dias da semana: "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"
  const weekdays = useMemo(() => {
    return Array.from({ length: WEEK_LENGTH }, (_, index) => {
      try {
        const raw = new Intl.DateTimeFormat(locale, {
          weekday: 'short',
        }).format(
          new Date(
            FIRST_SUNDAY.getFullYear(),
            FIRST_SUNDAY.getMonth(),
            FIRST_SUNDAY.getDate() + index,
          ),
        );
        const clean = raw.replace('.', '');
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      } catch {
        return ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][index];
      }
    });
  }, [locale]);

  const formattedSelectedDate = useMemo(() => {
    try {
      const date = fromCalendarDate(selectedDate);
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(date);
    } catch {
      return selectedDate;
    }
  }, [locale, selectedDate]);

  const speciesLabels: Record<Species, string> = useMemo(
    () => ({
      CANINE: t('appointments.species.canine'),
      FELINE: t('appointments.species.feline'),
      OTHER: t('appointments.species.other'),
    }),
    [t],
  );

  const handleSelectAppointment = useCallback(
    (appointment: Appointment) => {
      onSelectAppointment?.(appointment);
    },
    [onSelectAppointment],
  );

  const defaultHeader = (
    <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={onBack}
        hitSlop={8}
        className="size-11 items-center justify-center rounded-full bg-button-primary active:opacity-80"
      >
        <Icon as={ArrowLeft} className="size-5 text-white" />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('appointments.newAppointment')}
        onPress={() => {}}
        hitSlop={8}
        className="size-11 items-center justify-center rounded-full bg-button-primary active:opacity-80"
      >
        <Icon as={Plus} className="size-5 text-white" />
      </Pressable>
    </View>
  );

  return (
    <View className="flex-1">
      {header !== undefined ? header : defaultHeader}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Calendário Mensal */}
        <AppointmentCalendar
          year={year}
          monthIndex={monthIndex}
          selectedDate={selectedDate}
          appointmentsByDate={appointmentsByDate}
          monthLabel={monthLabel}
          weekdays={weekdays}
          previousMonthLabel={t('appointments.calendar.prevMonth')}
          nextMonthLabel={t('appointments.calendar.nextMonth')}
          onSelectDate={onSelectDate}
          onPreviousMonth={onPreviousMonth}
          onNextMonth={onNextMonth}
          className="mt-2"
        />

        {/* Indicador de carregamento ou erro */}
        {isLoading && !isRefreshing && (
          <View className="py-4 items-center justify-center">
            <ActivityIndicator size="small" color="#594236" />
          </View>
        )}

        {error && (
          <View className="p-3 my-2 rounded-xl bg-alert-primary/10 border border-alert-primary/30">
            <Text className="text-xs text-alert-primary text-center font-medium">
              {error}
            </Text>
          </View>
        )}

        {/* Lista de agendamentos do dia selecionado */}
        <AppointmentDayList
          date={selectedDate}
          formattedDate={formattedSelectedDate}
          appointments={selectedDayAppointments}
          sectionTitle={t('appointments.sectionTitle')}
          emptyTitle={t('appointments.emptyDay')}
          emptySubtitle={t('appointments.emptyDaySub')}
          addLabel={t('appointments.newAppointment')}
          speciesLabels={speciesLabels}
          onAddAppointment={() => {}}
          onSelectAppointment={handleSelectAppointment}
        />
      </ScrollView>
    </View>
  );
}
