import { ScrollView, StyleSheet, Text } from 'react-native';

import { useTranslation } from 'shared/i18n';

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
  /** Dados reais de estoque carregados pela tela chamadora. */
  items: readonly MonitoredItem[];
  lots: readonly ExpiringLot[];
  referenceDate?: Date;
  /** Só para demonstração e teste — a aba de Estoque não passa isto. */
  seedTimestamps?: AlertTimestamps;
};

export function InventoryNotificationsScreen({
  status = 'ready',
  userId,
  items,
  lots,
  referenceDate,
  seedTimestamps,
}: InventoryNotificationsScreenProps) {
  const { t } = useTranslation();

  if (status === 'loading') {
    return (
      <ScrollView
        className="flex-1 bg-background-modal"
        contentContainerClassName="gap-3 px-4 py-6"
      >
        <Text style={styles.heading}>{t('inventory.notifications.title')}</Text>
        <Text style={styles.empty}>{t('inventory.overview.loading')}</Text>
      </ScrollView>
    );
  }

  if (status === 'error') {
    return (
      <ScrollView
        className="flex-1 bg-background-modal"
        contentContainerClassName="gap-3 px-4 py-6"
      >
        <Text style={styles.heading}>{t('inventory.notifications.title')}</Text>
        <Text style={styles.empty}>{t('inventory.notifications.error')}</Text>
      </ScrollView>
    );
  }

  return (
    <ReadyInventoryNotifications
      userId={userId}
      items={items}
      lots={lots}
      referenceDate={referenceDate}
      seedTimestamps={seedTimestamps}
    />
  );
}

function ReadyInventoryNotifications({
  userId,
  items,
  lots,
  referenceDate,
  seedTimestamps,
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
    <ScrollView
      className="flex-1 bg-background-modal"
      contentContainerClassName="gap-3 px-4 py-6"
    >
      <Text style={styles.heading}>{t('inventory.notifications.title')}</Text>

      {notifications.length === 0 ? (
        <Text style={styles.empty}>{t('inventory.notifications.empty')}</Text>
      ) : (
        notifications.map(notification => (
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
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: {
    color: '#9E9E9E',
    fontSize: 14,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
  },
});
