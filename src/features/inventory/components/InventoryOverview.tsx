import { BellRing, PackageSearch } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { MaterialCard } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { formatExpirationDate, type ExpiringLot } from '../domain/expiryAlert';
import {
  inventoryAlertState,
  inventorySummary,
  type InventoryDisplayItem,
} from '../domain/inventoryOverview';

type Props = {
  status?: 'loading' | 'ready';
  items: readonly InventoryDisplayItem[];
  lots: readonly ExpiringLot[];
  referenceDate?: Date;
};

export function InventoryOverview({
  status = 'ready',
  items,
  lots,
  referenceDate = new Date(),
}: Props) {
  const { t } = useTranslation();

  if (status === 'loading') {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background-modal px-6">
        <Icon as={PackageSearch} size={28} className="text-muted-foreground" />
        <Text className="text-sm text-muted-foreground">
          {t('inventory.overview.loading')}
        </Text>
      </View>
    );
  }

  const summary = inventorySummary(items, lots, referenceDate);

  return (
    <ScrollView
      className="flex-1 bg-background-modal"
      contentContainerClassName="gap-4 px-4 pb-8 pt-5"
    >
      <View className="gap-1">
        <Text className="text-2xl font-bold">
          {t('inventory.overview.title')}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {t('inventory.overview.subtitle')}
        </Text>
      </View>

      <View className="flex-row items-center gap-3 rounded-2xl bg-[#FCEDEA] p-4">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
          <Icon as={BellRing} size={20} className="text-alert-primary" />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-sm font-semibold text-alert-primary">
            {t('inventory.overview.attention')}
          </Text>
          <Text className="text-xs leading-[18px] text-label-primary">
            {t(
              summary.lowStockCount === 1
                ? 'inventory.overview.lowStockSingular'
                : 'inventory.overview.lowStockPlural',
              { count: summary.lowStockCount },
            )}
            {' · '}
            {t(
              summary.expiringLotCount === 1
                ? 'inventory.overview.expirySingular'
                : 'inventory.overview.expiryPlural',
              { count: summary.expiringLotCount },
            )}
          </Text>
        </View>
      </View>

      <Text className="mt-1 text-sm font-semibold">
        {t('segmentedControl.supplies')}
      </Text>

      {items.length === 0 ? (
        <Text className="py-8 text-center text-sm text-muted-foreground">
          {t('inventory.overview.empty')}
        </Text>
      ) : (
        items.map(item => {
          const alert = inventoryAlertState(item, lots, referenceDate);
          return (
            <MaterialCard
              key={item.id}
              name={item.name}
              category={item.category}
              price={item.price}
              unit={item.unit}
              quantity={item.quantity}
              minQuantity={item.minimumStock}
              alerts={alert.expiringLots.map(lot =>
                t('inventory.card.expiry', {
                  date: formatExpirationDate(lot.expirationDate),
                }),
              )}
            />
          );
        })
      )}
    </ScrollView>
  );
}
