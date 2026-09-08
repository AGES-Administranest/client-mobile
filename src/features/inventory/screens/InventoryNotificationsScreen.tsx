import { ScrollView, StyleSheet, Text } from 'react-native';

import { useTranslation } from 'shared/i18n';

import { InventoryNotificationCard } from '../components/InventoryNotificationCard';
import { formatExpirationDate } from '../domain/expiryAlert';
import {
  AlertTimestamps,
  InventoryItem,
  InventoryNotification,
} from '../domain/inventoryNotifications';
import { useInventoryNotifications } from '../hooks/useInventoryNotifications';

type InventoryNotificationsScreenProps = {
  /**
   * Recebida por prop: quem tem a lista de itens é a aba de Estoque. Quando o
   * CRUD da US09 existir, é ela que passa os dados reais aqui.
   */
  items: readonly InventoryItem[];
  referenceDate?: Date;
  /** Só para demonstração e teste — a aba de Estoque não passa isto. */
  seedTimestamps?: AlertTimestamps;
};

export function InventoryNotificationsScreen({
  items,
  referenceDate,
  seedTimestamps,
}: InventoryNotificationsScreenProps) {
  const { t } = useTranslation();
  const { notifications, dismiss } = useInventoryNotifications(
    items,
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
    <ScrollView contentContainerStyle={styles.container}>
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
  container: {
    backgroundColor: '#F2F2F7',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  empty: {
    color: '#9E9E9E',
    fontSize: 14,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
  },
});
