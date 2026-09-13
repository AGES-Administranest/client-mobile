import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import {
  MovementList,
  type MovementListItem,
} from '../components/MovementList';
import {
  formatMovementDate,
  formatQuantity,
  formatSignedValue,
} from '../domain/formatMovement';
import {
  getMovementAppointment,
  getMovementOriginKey,
  getUnitPluralForm,
} from '../domain/stockMovement';
import { useMovementHistory } from '../hooks/useMovementHistory';

export function MovementHistoryScreen() {
  const { t, locale } = useTranslation();
  const { movements, isLoading, hasError, retry } = useMovementHistory();

  const items: MovementListItem[] = movements.map(movement => {
    const appointment = getMovementAppointment(movement);
    const unit = t(
      `stock.movementHistory.units.${movement.unit}.${getUnitPluralForm(
        movement,
      )}`,
    );

    return {
      id: movement.id,
      direction: movement.type,
      title: movement.itemName,
      subtitle: formatMovementDate(movement.occurredAt, locale),
      category: t(
        `stock.movementHistory.origins.${getMovementOriginKey(movement)}`,
      ),
      value: formatSignedValue(movement, locale),
      valueCaption: t('stock.movementHistory.quantity', {
        quantity: formatQuantity(movement, locale),
        unit,
      }),
      link: appointment
        ? t('stock.movementHistory.appointmentLink', {
            appointment: appointment.label,
          })
        : undefined,
    };
  });

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background-modal">
      <ScrollView contentContainerClassName="gap-4 px-4 py-4">
        <View className="gap-1">
          <Text variant="h4">{t('stock.movementHistory.title')}</Text>
          <Text variant="muted">{t('stock.movementHistory.description')}</Text>
        </View>
        <MovementList
          items={items}
          isLoading={isLoading}
          emptyMessage={t('stock.movementHistory.empty')}
          error={
            hasError
              ? {
                  message: t('stock.movementHistory.error'),
                  retryLabel: t('common.retry'),
                  onRetry: retry,
                }
              : undefined
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}
