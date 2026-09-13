import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { isRangeComplete, type CalendarRange } from 'shared/utils/calendar';

import { MovementFilters } from '../components/MovementFilters';
import {
  MovementList,
  type MovementListItem,
} from '../components/MovementList';
import {
  formatCalendarDate,
  formatMovementDate,
  formatQuantity,
  formatSignedValue,
} from '../domain/formatMovement';
import {
  getMovementAppointment,
  getMovementOriginKey,
  getUnitPluralForm,
} from '../domain/stockMovement';
import { useMovementFilters } from '../hooks/useMovementFilters';
import { useMovementHistory } from '../hooks/useMovementHistory';

export function MovementHistoryScreen() {
  const { t, locale } = useTranslation();
  const { movements, isLoading, hasError, retry } = useMovementHistory();
  const {
    filters,
    visibleMovements,
    isFiltering,
    setItemName,
    setRange,
    clearFilters,
  } = useMovementFilters(movements);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const periodLabel = (range: CalendarRange) => {
    if (range.from === null) {
      return t('stock.movementHistory.filters.period');
    }

    const from = formatCalendarDate(range.from, locale);

    if (range.to === null) {
      return t('stock.movementHistory.filters.periodFrom', { from });
    }

    if (range.to === range.from) {
      return t('stock.movementHistory.filters.periodSingle', { day: from });
    }

    return t('stock.movementHistory.filters.periodRange', {
      from,
      to: formatCalendarDate(range.to, locale),
    });
  };

  const items: MovementListItem[] = visibleMovements.map(movement => {
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

        <MovementFilters
          itemName={filters.itemName}
          onItemNameChange={setItemName}
          range={filters.range}
          onRangeChange={range => {
            setRange(range);

            if (isRangeComplete(range)) {
              setIsCalendarOpen(false);
            }
          }}
          isCalendarOpen={isCalendarOpen}
          onToggleCalendar={() => setIsCalendarOpen(open => !open)}
          onClear={() => {
            clearFilters();
            setIsCalendarOpen(false);
          }}
          canClear={isFiltering}
          locale={locale}
          searchPlaceholder={t(
            'stock.movementHistory.filters.searchPlaceholder',
          )}
          periodLabel={periodLabel(filters.range)}
          clearLabel={t('stock.movementHistory.filters.clear')}
          previousMonthLabel={t('stock.movementHistory.filters.previousMonth')}
          nextMonthLabel={t('stock.movementHistory.filters.nextMonth')}
        />

        <MovementList
          items={items}
          isLoading={isLoading}
          emptyMessage={t(
            isFiltering
              ? 'stock.movementHistory.emptyFiltered'
              : 'stock.movementHistory.empty',
          )}
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
