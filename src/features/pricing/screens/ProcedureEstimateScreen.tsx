import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from 'app/components/ui/icon';
import { SlideInModal } from 'app/components/ui/slide-in-modal';
import { Text } from 'app/components/ui/text';
import { useClientSearch } from 'features/clients';
import {
  formatSupplyPrice,
  SupplySelectorSheet,
  useSupplySelector,
} from 'features/stock';
import { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';
import { monthOf } from 'shared/utils/monthPeriod';
import { BackgroundPrimary } from 'theme/colors';

import { PricingSetupView } from './PricingSetupView';
import {
  ProcedureEstimateContent,
  type ProcedureEstimateTexts,
} from '../components/ProcedureEstimateContent';
import { formatDurationDisplay } from '../domain/procedureEstimate';
import { useProcedureEstimate } from '../hooks/useProcedureEstimate';

const MIN_TOP_PADDING = 16;
const styles = StyleSheet.create({ fill: { flex: 1 } });

export type ProcedureEstimateScreenProps = {
  visible: boolean;
  onClose: () => void;
};

export function ProcedureEstimateScreen({
  visible,
  onClose,
}: ProcedureEstimateScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <SlideInModal visible={visible} onRequestClose={onClose}>
      <View
        style={[
          styles.fill,
          {
            paddingTop: Math.max(insets.top, MIN_TOP_PADDING),
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <LinearGradient
          colors={BackgroundPrimary.colors}
          locations={BackgroundPrimary.locations}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <ProcedureEstimateBody onClose={onClose} visible={visible} />
      </View>
    </SlideInModal>
  );
}

function ProcedureEstimateBody({
  onClose,
  visible,
}: {
  onClose: () => void;
  visible: boolean;
}) {
  const { t, locale } = useTranslation();
  const [currentMonth] = useState(() => monthOf(new Date()));
  const [isConfiguringPricing, setIsConfiguringPricing] = useState(false);
  const [isSupplySheetVisible, setIsSupplySheetVisible] = useState(false);

  const estimate = useProcedureEstimate();

  const clientSearch = useClientSearch({
    active: visible && !isConfiguringPricing,
    paused: Boolean(estimate.selectedClient),
  });

  const supplySelector = useSupplySelector();

  const goBack = isConfiguringPricing
    ? () => setIsConfiguringPricing(false)
    : onClose;

  function handleConfirmSupply(): void {
    const selection = supplySelector.submit();
    if (!selection) return;

    const matchedOption = supplySelector.options.find(
      opt => opt.id === selection.itemId,
    );

    estimate.addSupply({
      itemId: selection.itemId,
      name: selection.name,
      unit: selection.unit,
      quantity: selection.quantity,
      unitCost: matchedOption?.price ?? 25.0,
    });

    setIsSupplySheetVisible(false);
  }

  const texts: ProcedureEstimateTexts = {
    durationTitle: t('pricing.procedureEstimate.duration.title'),
    hoursLabel: t('pricing.procedureEstimate.duration.hours'),
    minutesLabel: t('pricing.procedureEstimate.duration.minutes'),
    hoursPlaceholder: t('pricing.procedureEstimate.duration.hoursPlaceholder'),
    minutesPlaceholder: t(
      'pricing.procedureEstimate.duration.minutesPlaceholder',
    ),
    clientTitle: t('pricing.procedureEstimate.client.title'),
    clientPlaceholder: t('pricing.procedureEstimate.client.placeholder'),
    clearClientLabel: t('pricing.procedureEstimate.client.clear'),
    clientAutocompleteMessages: {
      empty: t('pricing.procedureEstimate.client.empty'),
      error: t('pricing.procedureEstimate.client.error'),
      loading: t('pricing.procedureEstimate.client.loading'),
    },
    suppliesTitle: t('pricing.procedureEstimate.supplies.title'),
    addSupplyLabel: t('pricing.procedureEstimate.supplies.add'),
    noSuppliesMessage: t('pricing.procedureEstimate.supplies.empty'),
    removeSupplyLabel: t('pricing.procedureEstimate.supplies.remove'),
    unconfiguredTitle: t('pricing.procedureEstimate.unconfigured.title'),
    unconfiguredMessage: t('pricing.procedureEstimate.unconfigured.message'),
    configurePricingLabel: t('pricing.procedureEstimate.unconfigured.action'),
    resultTexts: {
      title: t('pricing.procedureEstimate.result.title'),
      idleMessage: t('pricing.procedureEstimate.result.idle'),
      loadingMessage: t('pricing.procedureEstimate.result.loading'),
      errorMessage: t('pricing.procedureEstimate.result.error'),
      retryLabel: t('pricing.procedureEstimate.result.retry'),
      breakdownTitle: t('pricing.procedureEstimate.result.breakdownTitle'),
      hoursLabel: t('pricing.procedureEstimate.result.hours'),
      tripLabel: t('pricing.procedureEstimate.result.trip'),
      suppliesLabel: t('pricing.procedureEstimate.result.supplies'),
      tripNotIncludedWarning: t(
        'pricing.procedureEstimate.result.tripNotIncluded',
      ),
      breakEvenLabel: t('pricing.procedureEstimate.result.breakEven'),
    },
  };

  return (
    <>
      <View className="gap-3 px-[15px] pb-2 pt-0">
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel={t('pricing.procedureEstimate.back')}
          hitSlop={8}
          className="size-9 items-center justify-center rounded-full bg-button-primary active:opacity-80"
        >
          <Icon as={ArrowLeft} size={20} className="text-label-secondary" />
        </Pressable>

        <View className="px-[7px]">
          <Text
            accessibilityRole="header"
            className="text-xl font-bold leading-[30px] tracking-[-0.2px] text-label-primary"
          >
            {t(
              isConfiguringPricing
                ? 'pricing.setup.title'
                : 'pricing.procedureEstimate.title',
            )}
          </Text>
          <Text className="text-[13px] leading-[19.5px] text-label-primary">
            {t(
              isConfiguringPricing
                ? 'pricing.setup.subtitle'
                : 'pricing.procedureEstimate.subtitle',
            )}
          </Text>
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerClassName="gap-[18px] px-[22px] pb-10 pt-2.5"
      >
        {isConfiguringPricing ? (
          <PricingSetupView
            month={currentMonth}
            onSaved={() => {
              setIsConfiguringPricing(false);
              estimate.reload();
            }}
          />
        ) : (
          <ProcedureEstimateContent
            hours={estimate.hours}
            minutes={estimate.minutes}
            durationError={estimate.durationValidation.error}
            onChangeHours={estimate.setHours}
            onChangeMinutes={estimate.setMinutes}
            selectedClient={estimate.selectedClient}
            clientTerm={clientSearch.term}
            clientSearchStatus={clientSearch.status}
            clientOptions={clientSearch.options}
            onChangeClientTerm={clientSearch.onTermChange}
            onSelectClient={estimate.selectClient}
            onClearClient={estimate.clearClient}
            supplies={estimate.selectedSupplies}
            onOpenSupplySelector={() => setIsSupplySheetVisible(true)}
            onRemoveSupply={estimate.removeSupply}
            formatSupplyCost={cost => formatCurrency(cost, locale)}
            status={estimate.status}
            estimate={estimate.estimate}
            formattedMinimumPrice={
              estimate.estimate
                ? formatCurrency(estimate.estimate.minimumPrice, locale)
                : ''
            }
            formattedBreakEvenPrice={
              estimate.estimate
                ? formatCurrency(estimate.estimate.breakEvenPrice, locale)
                : ''
            }
            formattedHoursCost={
              estimate.estimate
                ? formatCurrency(estimate.estimate.hoursCost, locale)
                : ''
            }
            formattedTripCost={
              estimate.estimate
                ? formatCurrency(estimate.estimate.tripCost, locale)
                : ''
            }
            formattedSuppliesCost={
              estimate.estimate
                ? formatCurrency(estimate.estimate.suppliesCost, locale)
                : ''
            }
            formattedHourlyRate={
              estimate.estimate
                ? formatCurrency(estimate.estimate.hourlyRateUsed, locale)
                : ''
            }
            formattedDuration={
              estimate.estimate
                ? formatDurationDisplay(estimate.estimate.durationMinutes)
                : ''
            }
            onRetry={estimate.retry}
            onConfigurePricing={() => setIsConfiguringPricing(true)}
            texts={texts}
          />
        )}
      </ScrollView>

      {/* Sheet para seleção de insumos (US06 / Stock) */}
      <SupplySelectorSheet
        visible={isSupplySheetVisible}
        onClose={() => setIsSupplySheetVisible(false)}
        onConfirm={handleConfirmSupply}
        term={supplySelector.term}
        onTermChange={supplySelector.onTermChange}
        options={supplySelector.options}
        isLoading={supplySelector.isLoading}
        hasError={supplySelector.hasError}
        isTermTooShort={supplySelector.isTermTooShort}
        selected={supplySelector.selected}
        onSelect={supplySelector.onSelect}
        quantity={supplySelector.quantity}
        onQuantityChange={supplySelector.onQuantityChange}
        isOverBalance={supplySelector.isOverBalance}
        canSubmit={supplySelector.canSubmit}
        title={t('stock.supplySelector.title')}
        materialLabel={t('stock.supplySelector.materialLabel')}
        searchPlaceholder={t('stock.supplySelector.searchPlaceholder')}
        quantityLabel={t('stock.supplySelector.quantityLabel')}
        confirmLabel={t('stock.supplySelector.confirm')}
        closeLabel={t('stock.supplySelector.close')}
        emptyMessage={t('stock.supplySelector.empty')}
        errorMessage={t('stock.supplySelector.error')}
        loadingMessage={t('stock.supplySelector.loading')}
        termTooShortMessage={t('stock.supplySelector.termTooShort')}
        insufficientStockMessage={t('stock.supplySelector.insufficientStock')}
        formatPrice={option => formatSupplyPrice(option.price)}
      />
    </>
  );
}
