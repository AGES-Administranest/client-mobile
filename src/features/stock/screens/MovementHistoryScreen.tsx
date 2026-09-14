import { Plus } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';
import { isRangeComplete, type CalendarRange } from 'shared/utils/calendar';

import { MovementFilters } from '../components/MovementFilters';
import {
  MovementList,
  type MovementListItem,
} from '../components/MovementList';
import { OutputAdjustmentModal } from '../components/OutputAdjustmentModal';
import {
  formatCalendarDate,
  formatMovementDate,
  formatQuantity,
  formatSignedValue,
} from '../domain/formatMovement';
import { ADJUSTMENT_REASONS } from '../domain/outputAdjustment';
import {
  getMovementAppointment,
  getMovementOriginKey,
  getUnitPluralForm,
} from '../domain/stockMovement';
import { useMovementFilters } from '../hooks/useMovementFilters';
import { useMovementHistory } from '../hooks/useMovementHistory';
import { useOutputAdjustment } from '../hooks/useOutputAdjustment';

const SAVED_MESSAGE_DURATION_MS = 3000;

type MovementHistoryScreenProps = {
  savedMessageDurationMs?: number;
};

export function MovementHistoryScreen({
  savedMessageDurationMs = SAVED_MESSAGE_DURATION_MS,
}: MovementHistoryScreenProps = {}) {
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
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const adjustment = useOutputAdjustment();

  useEffect(() => {
    if (savedAt === null) {
      return;
    }

    const timer = setTimeout(() => setSavedAt(null), savedMessageDurationMs);

    return () => clearTimeout(timer);
  }, [savedAt, savedMessageDurationMs]);

  const reasonLabels = Object.fromEntries(
    ADJUSTMENT_REASONS.map(reason => [
      reason,
      t(`stock.outputAdjustment.reasons.${reason}`),
    ]),
  ) as Record<(typeof ADJUSTMENT_REASONS)[number], string>;

  const errorMessages = {
    required: t('stock.outputAdjustment.errors.required'),
    mustBePositive: t('stock.outputAdjustment.errors.mustBePositive'),
  };

  const failureMessage = adjustment.failure
    ? t(
        `stock.outputAdjustment.errors.${adjustment.failure.code}` as
          | 'stock.outputAdjustment.errors.INSUFFICIENT_STOCK'
          | 'stock.outputAdjustment.errors.ITEM_NOT_FOUND'
          | 'stock.outputAdjustment.errors.UNKNOWN',
        adjustment.failure.params,
      )
    : null;

  const openAdjustment = () => {
    adjustment.reset();
    setSavedAt(null);
    setIsAdjustmentOpen(true);
  };

  const submitAdjustment = async () => {
    const saved = await adjustment.submit();

    if (saved) {
      setIsAdjustmentOpen(false);
      setSavedAt(current => (current ?? 0) + 1);
    }
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

      <OutputAdjustmentModal
        visible={isAdjustmentOpen}
        onClose={() => setIsAdjustmentOpen(false)}
        onSubmit={submitAdjustment}
        draft={adjustment.draft}
        items={adjustment.items}
        errors={adjustment.errors}
        isSaving={adjustment.isSaving}
        needsWrittenReason={adjustment.needsWrittenReason}
        onItemChange={adjustment.setItemId}
        onQuantityChange={adjustment.setQuantity}
        onReasonChange={adjustment.setReason}
        onOtherReasonChange={adjustment.setOtherReason}
        title={t('stock.outputAdjustment.title')}
        itemLabel={t('stock.outputAdjustment.itemLabel')}
        itemPlaceholder={t('stock.outputAdjustment.itemPlaceholder')}
        quantityLabel={t('stock.outputAdjustment.quantityLabel')}
        quantityPlaceholder={t('stock.outputAdjustment.quantityPlaceholder')}
        reasonLabel={t('stock.outputAdjustment.reasonLabel')}
        otherReasonLabel={t('stock.outputAdjustment.otherReasonLabel')}
        otherReasonPlaceholder={t(
          'stock.outputAdjustment.otherReasonPlaceholder',
        )}
        saveLabel={t('stock.outputAdjustment.save')}
        closeLabel={t('stock.outputAdjustment.close')}
        failureMessage={failureMessage}
        reasonLabels={reasonLabels}
        errorMessages={errorMessages}
      />
    </SafeAreaView>
  );
}
