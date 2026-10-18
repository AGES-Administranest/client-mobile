import { Plus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { onConnectionRestored } from 'shared/services';
import { isRangeComplete, type CalendarRange } from 'shared/utils/calendar';

import { OutputAdjustmentSheet } from './OutputAdjustmentSheet';
import { MovementFilters } from '../../../app/components/ui/MovementFilters';
import {
  MovementList,
  type MovementListItem,
} from '../../../app/components/ui/MovementList';
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
import { useStockSyncState } from '../hooks/StockSyncContext';
import { useMovementFilters } from '../hooks/useMovementFilters';
import { useMovementHistory } from '../hooks/useMovementHistory';

const SAVED_MESSAGE_DURATION_MS = 3000;

type MovementHistoryScreenProps = {
  savedMessageDurationMs?: number;
  searchDebounceMs?: number;
  // Dentro da rolagem de Finanças: no iOS uma segunda rolagem vertical segura o
  // arrasto e a página para de rolar.
  embedded?: boolean;
};

export function MovementHistoryScreen({
  savedMessageDurationMs = SAVED_MESSAGE_DURATION_MS,
  searchDebounceMs,
  embedded = false,
}: MovementHistoryScreenProps = {}) {
  const { t, locale } = useTranslation();
  const {
    filters,
    isFiltering,
    isNarrowing,
    setItemName,
    setRange,
    clearFilters,
  } = useMovementFilters();
  const { movements, pendingIds, isLoading, hasError, retry } =
    useMovementHistory(filters, searchDebounceMs);
  const { syncedAt, pendingCount } = useStockSyncState();
  const queuedBefore = useRef(pendingCount);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => onConnectionRestored(retry), [retry]);

  useEffect(() => {
    if (syncedAt === null) {
      return;
    }

    retry();
  }, [syncedAt, retry]);

  useEffect(() => {
    if (pendingCount > queuedBefore.current) {
      retry();
    }
    queuedBefore.current = pendingCount;
  }, [pendingCount, retry]);

  useEffect(() => {
    if (savedAt === null) {
      return;
    }

    const timer = setTimeout(() => setSavedAt(null), savedMessageDurationMs);

    return () => clearTimeout(timer);
  }, [savedAt, savedMessageDurationMs]);

  const openAdjustment = () => {
    setSavedAt(null);
    setIsAdjustmentOpen(true);
  };

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

  const pending = new Set(pendingIds);

  const items: MovementListItem[] = movements.map(movement => {
    const appointment = getMovementAppointment(movement);
    const date = formatMovementDate(movement.occurredAt, locale);
    const unit = t(
      `stock.movementHistory.units.${movement.unit}.${getUnitPluralForm(
        movement,
      )}`,
    );

    return {
      id: movement.id,
      direction: movement.type,
      title: movement.itemName,
      subtitle: pending.has(movement.id)
        ? t('stock.movementHistory.pending', { date })
        : date,
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
    <SafeAreaView
      edges={embedded ? [] : ['top']}
      className="flex-1 bg-background-modal"
    >
      <ScrollView
        scrollEnabled={!embedded}
        contentContainerClassName="gap-4 px-4 py-4"
      >
        <Button
          shape="pill"
          icon={Plus}
          onPress={openAdjustment}
          className="h-12"
        >
          <Text>{t('stock.movementHistory.newEntry')}</Text>
        </Button>

        {savedAt !== null ? (
          <View className="rounded-xl border border-details-tertiary bg-details-secondary p-3">
            <Text className="text-sm text-label-primary">
              {t('stock.movementHistory.savedMessage')}
            </Text>
          </View>
        ) : null}

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
            isNarrowing
              ? 'stock.movementHistory.emptyFiltered'
              : 'stock.movementHistory.empty',
          )}
          error={
            hasError && items.length === 0
              ? {
                  message: t('stock.movementHistory.error'),
                  retryLabel: t('common.retry'),
                  onRetry: retry,
                }
              : undefined
          }
        />
      </ScrollView>

      <OutputAdjustmentSheet
        visible={isAdjustmentOpen}
        onClose={() => setIsAdjustmentOpen(false)}
        onSaved={() => {
          setIsAdjustmentOpen(false);
          setSavedAt(current => (current ?? 0) + 1);
        }}
      />
    </SafeAreaView>
  );
}
