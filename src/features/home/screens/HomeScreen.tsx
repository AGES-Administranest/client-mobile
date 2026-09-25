import { LinearGradient } from 'expo-linear-gradient';
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  LogOut,
  UserRound,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from 'app/components/ui/icon';
import { OptionsModal } from 'app/components/ui/options-modal';
import { AppointmentsScreen } from 'features/appointments';
import { useAuth } from 'features/auth';
import {
  InventoryNotificationsScreen,
  isValidExpirationDate,
  type ExpiringLot,
  type MonitoredItem,
} from 'features/inventory';
import { fetchItems } from 'features/materials';
import { useTranslation } from 'shared/i18n';
import { Colors } from 'theme/colors';

export function HomeScreen() {
  const { t } = useTranslation();
  const { session, account, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [calendarVisible, setCalendarVisible] = useState(false);
  const [accountVisible, setAccountVisible] = useState(false);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [monitoredItems, setMonitoredItems] = useState<MonitoredItem[]>([]);
  const [expiringLots, setExpiringLots] = useState<ExpiringLot[]>([]);

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

  return (
    <View className="flex-1 items-center justify-center">
      <Pressable
        onPress={openNotifications}
        accessibilityRole="button"
        accessibilityLabel={t('inventory.notifications.title')}
        hitSlop={8}
        className="absolute left-4 top-3 h-11 w-11 items-center justify-center rounded-full bg-details-primary active:opacity-70"
      >
        <Icon as={Bell} className="size-5 text-label-quartenery" />
      </Pressable>
      <Pressable
        onPress={() => setAccountVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={t('auth.account.menu')}
        hitSlop={8}
        className="absolute right-4 top-3 h-11 w-11 items-center justify-center rounded-full bg-details-primary active:opacity-70"
      >
        <Icon as={UserRound} className="size-5 text-label-quartenery" />
      </Pressable>

      <Text className="text-2xl font-semibold mb-6">{t('tabbar.day')}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('appointments.viewMonth')}
        onPress={() => setCalendarVisible(true)}
        hitSlop={8}
        className="flex-row items-center gap-2 rounded-full bg-button-primary px-5 py-3 shadow-sm active:opacity-80"
      >
        <Icon as={CalendarDays} className="size-5 text-white" />
        <Text className="text-sm font-bold text-white">
          {t('appointments.viewMonth')}
        </Text>
      </Pressable>

      {/* Modal do Calendário Mensal (US07) */}
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
          <AppointmentsScreen onBack={() => setCalendarVisible(false)} />
        </View>
      </Modal>

      {/* Modal de Notificações de Estoque */}
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

      {/* Modal de Opções de Conta */}
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
    </View>
  );
}
