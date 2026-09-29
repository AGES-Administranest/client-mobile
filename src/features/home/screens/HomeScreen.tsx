import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  CalendarX2,
  ChevronLeft,
  LogOut,
  Maximize2,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from 'app/components/ui/icon';
import { OptionsModal } from 'app/components/ui/options-modal';
import { Text } from 'app/components/ui/text';
import {
  AppointmentDayList,
  AppointmentsScreen,
  DaySummary,
  useAppointments,
  WeekStrip,
  type AppointmentStatus,
  type Species,
} from 'features/appointments';
import { useAuth } from 'features/auth';
import {
  InventoryNotificationsScreen,
  isValidExpirationDate,
  type ExpiringLot,
  type MonitoredItem,
} from 'features/inventory';
import { fetchItems } from 'features/materials';
import { AppointmentDetailScreen, DiaDiaScreen } from 'features/procedures';
import { useTranslation } from 'shared/i18n';
import { fromCalendarDate, toCalendarDate } from 'shared/utils/calendar';
import { Colors } from 'theme/colors';

export function HomeScreen() {
  const { t, locale } = useTranslation();
  const { session, account, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [accountVisible, setAccountVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [newProcedureVisible, setNewProcedureVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [openAppointmentId, setOpenAppointmentId] = useState<string | null>(
    null,
  );
  const [monitoredItems, setMonitoredItems] = useState<MonitoredItem[]>([]);
  const [expiringLots, setExpiringLots] = useState<ExpiringLot[]>([]);
  // Shared by the week strip here and the month screen, so both stay on the
  // same date.
  const calendar = useAppointments();
  const { selectedDate, selectedDayAppointments, onRefresh } = calendar;

  const openNotifications = useCallback(() => {
    setNotificationsVisible(true);
    if (!session) return;
    fetchItems(session.idToken).then(backendItems => {
      setMonitoredItems(
        backendItems.map(item => ({
          id: item.id,
          name: item.name,
          unit: item.unit,
          quantity: parseFloat(item.currentQuantity),
          minimumStock: item.minimumStock ? parseFloat(item.minimumStock) : 0,
        })),
      );
      setExpiringLots(
        backendItems
          .filter(
            (item): item is typeof item & { nearestExpiration: string } =>
              item.nearestExpiration !== null &&
              isValidExpirationDate(item.nearestExpiration),
          )
          .map(item => ({
            id: item.id,
            itemId: item.id,
            name: item.name,
            expirationDate:
              item.nearestExpiration as ExpiringLot['expirationDate'],
          })),
      );
    });
  }, [session]);

  const speciesLabels: Record<Species, string> = useMemo(
    () => ({
      CANINE: t('appointments.species.canine'),
      FELINE: t('appointments.species.feline'),
      OTHER: t('appointments.species.other'),
    }),
    [t],
  );
  const statusLabels: Partial<Record<AppointmentStatus, string>> = useMemo(
    () => ({
      COMPLETED: t('procedures.status.COMPLETED'),
      CANCELED: t('procedures.status.CANCELED'),
    }),
    [t],
  );

  // A canceled appointment neither happens nor earns, so it counts for neither.
  const summary = useMemo(() => {
    const active = selectedDayAppointments.filter(
      appointment => appointment.status !== 'CANCELED',
    );
    const revenue = active.reduce(
      (total, appointment) => total + Number(appointment.amount ?? 0),
      0,
    );
    return {
      count: active.length,
      revenue: revenue.toLocaleString(locale, { maximumFractionDigits: 2 }),
    };
  }, [selectedDayAppointments, locale]);

  const selected = fromCalendarDate(selectedDate);
  const isToday = selectedDate === toCalendarDate(new Date());
  const firstName = account?.name.trim().split(/\s+/)[0] ?? '';

  const openNewProcedure = () => {
    setCalendarVisible(false);
    setNewProcedureVisible(true);
  };

  const detail = (
    <AppointmentDetailScreen
      appointmentId={openAppointmentId}
      onClose={() => setOpenAppointmentId(null)}
      onChanged={onRefresh}
    />
  );

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="gap-4 pb-28 pt-3">
        <View className="flex-row items-center gap-3 px-4">
          <Pressable
            onPress={() => setAccountVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('auth.account.menu')}
            hitSlop={8}
            className="size-11 items-center justify-center rounded-full bg-button-primary active:opacity-80"
          >
            <Text className="text-base font-semibold text-white">
              {initials(account?.name ?? '')}
            </Text>
          </Pressable>
          <View className="flex-1">
            <Text
              className="text-xl font-bold text-label-primary"
              numberOfLines={1}
            >
              {t('home.greeting', { name: firstName })}
            </Text>
            <Text className="text-xs text-label-primary" numberOfLines={1}>
              {capitalize(
                new Date().toLocaleDateString(locale, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                }),
              )}
            </Text>
          </View>
          <Pressable
            onPress={openNotifications}
            accessibilityRole="button"
            accessibilityLabel={t('inventory.notifications.title')}
            hitSlop={8}
            className="size-11 items-center justify-center rounded-full bg-button-primary active:opacity-80"
          >
            <Icon as={Bell} className="size-5 text-white" />
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between px-4">
          <Text className="text-xl font-bold text-label-primary">
            {monthLabel(calendar.year, calendar.monthIndex, locale)}
          </Text>
          <Pressable
            onPress={() => setCalendarVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t('appointments.viewMonth')}
            hitSlop={8}
            className="flex-row items-center gap-1.5 rounded-lg bg-button-primary px-3 py-1.5 active:opacity-80"
          >
            <Icon as={Maximize2} className="size-3.5 text-white" />
            <Text className="text-sm font-semibold text-white">
              {t('appointments.viewMonth')}
            </Text>
          </Pressable>
        </View>

        <WeekStrip
          year={calendar.year}
          monthIndex={calendar.monthIndex}
          selectedDate={selectedDate}
          appointmentsByDate={calendar.appointmentsByDate}
          locale={locale}
          onSelectDate={calendar.onSelectDate}
        />

        <View className="gap-4 px-4">
          <DaySummary
            count={summary.count}
            revenue={summary.revenue}
            labels={{
              attendances: t('appointments.attendances'),
              day: t('appointments.dayOf', { day: selected.getDate() }),
              revenue: t('appointments.revenue'),
              estimated: t('appointments.estimated'),
            }}
          />

          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase text-label-primary">
              {`${t('appointments.agenda')} — ${agendaDate(selected, locale)}`}
            </Text>
            <Pressable
              onPress={openNewProcedure}
              accessibilityRole="button"
              hitSlop={8}
              className="active:opacity-70"
            >
              <Text className="text-xs text-label-primary">
                {t('appointments.addAttendance')}
              </Text>
            </Pressable>
          </View>

          {calendar.error ? (
            <Text className="py-4 text-center text-sm text-label-tertiary">
              {t('procedures.day.error')}
            </Text>
          ) : (
            <AppointmentDayList
              className="mt-0"
              sectionTitle=""
              date={selectedDate}
              formattedDate=""
              appointments={selectedDayAppointments}
              speciesLabels={speciesLabels}
              statusLabels={statusLabels}
              onSelectAppointment={appointment =>
                setOpenAppointmentId(appointment.id)
              }
              emptyState={
                calendar.isLoading ? null : (
                  <View className="items-center gap-3 py-16">
                    <Icon
                      as={CalendarX2}
                      className="size-16 text-label-primary"
                    />
                    <Text className="text-base font-semibold text-label-primary">
                      {isToday
                        ? t('appointments.emptyToday')
                        : t('appointments.emptySelectedDay')}
                    </Text>
                  </View>
                )
              }
            />
          )}
        </View>
      </ScrollView>

      <Modal
        visible={calendarVisible}
        animationType="slide"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <View
          className="flex-1"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          <LinearGradient
            colors={Colors.background.primary.colors}
            locations={Colors.background.primary.locations}
            style={StyleSheet.absoluteFill}
          />
          <AppointmentsScreen
            controller={calendar}
            statusLabels={statusLabels}
            onBack={() => setCalendarVisible(false)}
            onAddAppointment={openNewProcedure}
            onSelectAppointment={appointment =>
              setOpenAppointmentId(appointment.id)
            }
          />
          {/* The detail opens over this modal while it is up. */}
          {calendarVisible ? detail : null}
        </View>
      </Modal>
      {calendarVisible ? null : detail}

      <Modal
        visible={notificationsVisible}
        animationType="slide"
        onRequestClose={() => setNotificationsVisible(false)}
      >
        <View
          className="flex-1 bg-background-modal"
          style={{ paddingTop: insets.top }}
        >
          <Pressable
            onPress={() => setNotificationsVisible(false)}
            accessibilityRole="button"
            accessibilityLabel={t('auth.back')}
            hitSlop={8}
            className="ml-3 h-11 w-11 items-center justify-center"
          >
            <Icon as={ChevronLeft} className="size-7 text-label-quartenery" />
          </Pressable>
          <InventoryNotificationsScreen
            userId={account?.id ?? ''}
            items={monitoredItems}
            lots={expiringLots}
          />
        </View>
      </Modal>
      <OptionsModal
        visible={accountVisible}
        onClose={() => setAccountVisible(false)}
        options={[
          {
            labelKey: 'auth.account.signOut',
            icon: LogOut,
            variant: 'outline',
            onPress: () => {
              setAccountVisible(false);
              signOut();
            },
          },
        ]}
      />
      <DiaDiaScreen
        visible={newProcedureVisible}
        onClose={() => {
          setNewProcedureVisible(false);
          onRefresh();
        }}
      />
    </View>
  );
}

// "Bruna Senha" → "BS"
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1 ? words[0][0] + words[words.length - 1][0] : words[0]?.[0];
  return (letters ?? '').toUpperCase();
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// "Ago 2026"
function monthLabel(year: number, monthIndex: number, locale: string): string {
  const month = new Date(year, monthIndex, 1)
    .toLocaleDateString(locale, { month: 'short' })
    .replace('.', '');
  return `${capitalize(month)} ${year}`;
}

// "16 AGO"
function agendaDate(date: Date, locale: string): string {
  const month = date
    .toLocaleDateString(locale, { month: 'short' })
    .replace('.', '');
  return `${date.getDate()} ${month}`.toUpperCase();
}
