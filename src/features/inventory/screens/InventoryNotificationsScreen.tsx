import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Bell, BellOff } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from 'app/components/ui/empty-state';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { Colors } from 'theme/colors';

import { InventoryNotificationCard } from '../components/InventoryNotificationCard';
import { formatExpirationDate, type ExpiringLot } from '../domain/expiryAlert';
import {
  AlertTimestamps,
  InventoryNotification,
} from '../domain/inventoryNotifications';
import type { MonitoredItem } from '../domain/lowStockAlert';
import { useInventoryNotifications } from '../hooks/useInventoryNotifications';

type InventoryNotificationsScreenProps = {
  status?: 'loading' | 'ready' | 'error';
  userId: string;
  /**
   * Recebida por prop: quem tem a lista de itens é a aba de Estoque. Quando o
   * CRUD da US09 existir, é ela que passa os dados reais aqui.
   */
  items: readonly MonitoredItem[];
  lots: readonly ExpiringLot[];
  referenceDate?: Date;
  /** Só para demonstração e teste — a aba de Estoque não passa isto. */
  seedTimestamps?: AlertTimestamps;
  onBack?: () => void;
};

export function InventoryNotificationsScreen({
  status = 'ready',
  userId,
  items,
  lots,
  referenceDate,
  seedTimestamps,
  onBack,
}: InventoryNotificationsScreenProps) {
  const { t } = useTranslation();

  if (status !== 'ready') {
    return (
      <ScrollView
        className="flex-1 bg-background-modal"
        contentContainerClassName="gap-3 px-4 py-6"
      >
        <Text style={styles.heading}>{t('inventory.notifications.title')}</Text>
        <Text style={styles.empty}>
          {t(
            status === 'error'
              ? 'inventory.notifications.error'
              : 'inventory.overview.loading',
          )}
        </Text>
      </ScrollView>
      <NotificationsLayout onBack={onBack}>
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <Icon as={Bell} size={28} className="text-label-tertiary" />
          <Text className="text-sm text-label-tertiary">
            {t('inventory.overview.loading')}
          </Text>
        </View>
      </NotificationsLayout>
    );
  }

  return (
    <ReadyInventoryNotifications
      userId={userId}
      items={items}
      lots={lots}
      referenceDate={referenceDate}
      seedTimestamps={seedTimestamps}
      onBack={onBack}
    />
  );
}

function ReadyInventoryNotifications({
  userId,
  items,
  lots,
  referenceDate,
  seedTimestamps,
  onBack,
}: Omit<InventoryNotificationsScreenProps, 'status'>) {
  const { t } = useTranslation();
  const { notifications, dismiss } = useInventoryNotifications(
    userId,
    items,
    lots,
    referenceDate,
    seedTimestamps,
  );

  const describe = (notification: InventoryNotification) =>
    notification.kind === 'lowStock'
      ? t('inventory.notifications.lowStockBody', {
          quantity: notification.quantity,
          minimum: notification.minimumStock,
        })
      : t('inventory.notifications.expiryBody', {
          name: notification.name,
          date: formatExpirationDate(notification.expirationDate),
        });

  return (
    <NotificationsLayout onBack={onBack}>
      {notifications.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <EmptyState
            icon={BellOff}
            message={t('inventory.notifications.empty')}
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-3 px-4 pb-6"
          showsVerticalScrollIndicator={false}
        >
          {notifications.map(notification => (
            <InventoryNotificationCard
              key={notification.key}
              title={t(
                notification.kind === 'lowStock'
                  ? 'inventory.notifications.lowStockTitle'
                  : 'inventory.notifications.expiryTitle',
                { name: notification.name },
              )}
              description={describe(notification)}
              elapsed={t(`inventory.elapsed.${notification.elapsed.unit}`, {
                value: notification.elapsed.value,
              })}
              deleteLabel={t('inventory.notifications.delete')}
              onDismiss={() => dismiss(notification.key)}
            />
          ))}
        </ScrollView>
      )}
    </NotificationsLayout>
  );
}

function NotificationsLayout({
  onBack,
  children,
}: {
  onBack?: () => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1" style={{ paddingTop: insets.top }}>
      <LinearGradient
        colors={Colors.background.primary.colors}
        locations={Colors.background.primary.locations}
        style={StyleSheet.absoluteFill}
      />

      <View className="flex-row items-center px-3 pb-2 pt-1">
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={t('auth.back')}
          hitSlop={8}
          className="size-11 items-center justify-center rounded-full bg-button-primary active:opacity-80"
        >
          <Icon as={ArrowLeft} className="size-5 text-white" />
        </Pressable>
        <Text className="flex-1 text-center text-sm font-semibold text-label-primary">
          {t('inventory.notifications.title')}
        </Text>
        <View className="size-11" />
      </View>

      {children}
    </View>
  );
}
