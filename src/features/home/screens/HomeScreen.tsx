import {
  Bell,
  CalendarX2,
  ChevronLeft,
  LogOut,
  Maximize2,
  Minimize2,
} from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from 'app/components/ui/icon';
import { OptionsModal } from 'app/components/ui/options-modal';
import { Text } from 'app/components/ui/text';
import {
  AppointmentDayList,
  DaySummary,
  MonthCalendar,
  useAppointments,
  WeekStrip,
  type AppointmentStatus,
  type Species,
} from 'features/appointments';
import { useAuth } from 'features/auth';
import {
  InventoryNotificationsScreen,
  useInventory,
  isValidExpirationDate,
  type ExpiringLot,
  type MonitoredItem,
} from 'features/inventory';
import { fetchItems } from 'features/materials';
import { AppointmentDetailScreen, DiaDiaScreen } from 'features/procedures';
import { useTranslation } from 'shared/i18n';
import { fromCalendarDate, toCalendarDate } from 'shared/utils/calendar';

export function HomeScreen() {
  const { t, locale } = useTranslation();
  const { session, account, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const { status, items, lots, refresh } = useInventory();
  const [accountVisible, setAccountVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [newProcedureVisible, setNewProcedureVisible] = useState(false);
  const [monthExpanded, setMonthExpanded] = useState(false);
  // Expanded, the grid starts with no day picked and the agenda shows the
  // whole month; picking a day narrows it to that day.
  const [monthDayPicked, setMonthDayPicked] = useState(false);
  const showsMonth = monthExpanded && !monthDayPicked;
  const [openAppointmentId, setOpenAppointmentId] = useState<string | null>(
    null,
  );
  const [monitoredItems, setMonitoredItems] = useState<MonitoredItem[]>([]);
  const [expiringLots, setExpiringLots] = useState<ExpiringLot[]>([]);
  // Drives both the week strip and the expanded month grid, so switching
  // between them keeps the selected date.
  const calendar = useAppointments();
  const { selectedDate, selectedDayAppointments, onRefresh, monthString } =
    calendar;

  // Another month starts unpicked again.
  useEffect(() => setMonthDayPicked(false), [monthString]);

  const pickMonthDay = (date: string) => {
    if (monthDayPicked && date === selectedDate) {
      // Tapping the picked day again goes back to the whole month.
      setMonthDayPicked(false);
      return;
    }
    calendar.onSelectDate(date);
    setMonthDayPicked(true);
  };
  // Expanded, the agenda and its totals cover the whole visible month.
  const agenda = useMemo(
    () =>
      showsMonth
        ? [...calendar.appointments].sort((a, b) =>
            a.startsAt.localeCompare(b.startsAt),
          )
        : selectedDayAppointments,
    [showsMonth, calendar.appointments, selectedDayAppointments],
  );

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
    const active = agenda.filter(
      appointment => appointment.status !== 'CANCELED',
    );
    const revenue = active.reduce(
      (total, appointment) => total + Number(appointment.amount ?? 0),
      0,
    );
    return {
      count: active.length,
      // "2.000" stays whole, "2.467,50" keeps both decimals.
      revenue: revenue.toLocaleString(locale, {
        minimumFractionDigits: Number.isInteger(revenue) ? 0 : 2,
        maximumFractionDigits: 2,
      }),
    };
  }, [agenda, locale]);

  const selected = fromCalendarDate(selectedDate);
  const isToday = selectedDate === toCalendarDate(new Date());
  const firstName = account?.name.trim().split(/\s+/)[0] ?? '';

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
          {/* Expanded, the grid below carries the month and its arrows. */}
          {monthExpanded ? (
            <View />
          ) : (
            <Text className="text-xl font-bold text-label-primary">
              {monthLabel(calendar.year, calendar.monthIndex, locale)}
            </Text>
          )}
          <Pressable
            onPress={() => {
              setMonthDayPicked(false);
              setMonthExpanded(expanded => !expanded);
            }}
            accessibilityRole="button"
            accessibilityLabel={
              monthExpanded
                ? t('appointments.viewWeek')
                : t('appointments.viewMonth')
            }
            accessibilityState={{ expanded: monthExpanded }}
            hitSlop={8}
            className="flex-row items-center gap-1.5 rounded-lg bg-button-primary px-3 py-1.5 active:opacity-80"
          >
            <Icon
              as={monthExpanded ? Minimize2 : Maximize2}
              className="size-3.5 text-white"
            />
            <Text className="text-sm font-semibold text-white">
              {monthExpanded
                ? t('appointments.viewWeek')
                : t('appointments.viewMonth')}
            </Text>
          </Pressable>
        </View>

        <AnimatedSwap swapKey={monthExpanded}>
          {monthExpanded ? (
            <MonthCalendar
              controller={calendar}
              selectedDate={monthDayPicked ? selectedDate : null}
              onSelectDate={pickMonthDay}
              className="px-4"
            />
          ) : (
            <WeekStrip
              year={calendar.year}
              monthIndex={calendar.monthIndex}
              selectedDate={selectedDate}
              appointmentsByDate={calendar.appointmentsByDate}
              locale={locale}
              onSelectDate={calendar.onSelectDate}
            />
          )}
        </AnimatedSwap>

        <View className="gap-4 px-4">
          <DaySummary
            count={summary.count}
            revenue={summary.revenue}
            labels={{
              attendances: t('appointments.attendances'),
              day: showsMonth
                ? monthName(calendar.year, calendar.monthIndex, locale)
                : t('appointments.dayOf', { day: selected.getDate() }),
              revenue: t('appointments.revenue'),
              estimated: t('appointments.estimated'),
            }}
          />

          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-bold uppercase text-label-primary">
              {`${t('appointments.agenda')} — ${
                showsMonth
                  ? monthName(calendar.year, calendar.monthIndex, locale)
                  : agendaDate(selected, locale)
              }`}
            </Text>
            <Pressable
              onPress={() => setNewProcedureVisible(true)}
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
              appointments={agenda}
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
                      {showsMonth
                        ? t('appointments.emptyMonth')
                        : isToday
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

      <AppointmentDetailScreen
        appointmentId={openAppointmentId}
        onClose={() => setOpenAppointmentId(null)}
        onChanged={onRefresh}
      />

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
            status={status}
            userId={account?.id ?? ''}
            items={items}
            lots={lots}
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

const SWAP_DURATION_MS = 250;

// A className does not reach Animated.View, and without the clip the growing
// grid draws over the cards below it.
const styles = StyleSheet.create({ clip: { overflow: 'hidden' } });

// Grows or shrinks to the height of what it holds and fades the new content
// in whenever `swapKey` changes (the week strip ↔ month grid).
function AnimatedSwap({
  swapKey,
  children,
}: {
  swapKey: unknown;
  children: ReactNode;
}) {
  const height = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const measured = useRef(false);

  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: SWAP_DURATION_MS,
      useNativeDriver: true,
    }).start();
  }, [swapKey, opacity]);

  return (
    <Animated.View style={[styles.clip, measured.current ? { height } : null]}>
      <Animated.View
        style={{ opacity }}
        onLayout={event => {
          const next = event.nativeEvent.layout.height;
          if (!measured.current) {
            // First layout: take the size as is, nothing to animate from.
            measured.current = true;
            height.setValue(next);
            return;
          }
          Animated.timing(height, {
            toValue: next,
            duration: SWAP_DURATION_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        }}
      >
        {children}
      </Animated.View>
    </Animated.View>
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

// "setembro"
function monthName(year: number, monthIndex: number, locale: string): string {
  return new Date(year, monthIndex, 1).toLocaleDateString(locale, {
    month: 'long',
  });
}

// "16 AGO"
function agendaDate(date: Date, locale: string): string {
  const month = date
    .toLocaleDateString(locale, { month: 'short' })
    .replace('.', '');
  return `${date.getDate()} ${month}`.toUpperCase();
}
