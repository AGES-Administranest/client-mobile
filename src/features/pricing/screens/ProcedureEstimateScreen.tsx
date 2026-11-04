import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
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
import { EditSupplyQuantityModal } from '../components/EditSupplyQuantityModal';
import {
  ProcedureEstimateContent,
  type ProcedureEstimateTexts,
} from '../components/ProcedureEstimateContent';
import type { ProcedureSelectedSupply } from '../domain/pricing.types';
import {
  calculateSuppliesSubtotal,
  formatDurationDisplay,
  formatLaborCalculation,
} from '../domain/procedureEstimate';
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
  const [editingSupply, setEditingSupply] =
    useState<ProcedureSelectedSupply | null>(null);
  const [isSavedToastVisible, setIsSavedToastVisible] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      unitCost: matchedOption?.price ?? 15.0,
    });

    setIsSupplySheetVisible(false);
    supplySelector.reset();
  }

  function handleEditSupply(supply: ProcedureSelectedSupply): void {
    setEditingSupply(supply);
  }

  function handleConfirmEditSupply(newQuantity: number): void {
    if (editingSupply) {
      estimate.updateSupplyQuantity(editingSupply.itemId, newQuantity);
      setEditingSupply(null);
    }
  }

  const handleSaveSimulation = useCallback(async () => {
    const success = await estimate.saveSimulation();
    if (success) {
      setIsSavedToastVisible(true);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = setTimeout(() => {
        setIsSavedToastVisible(false);
      }, 3000);
    }
  }, [estimate]);

  const handleClearFields = useCallback(() => {
    estimate.clearForm();
  }, [estimate]);

  const suppliesSubtotalValue = estimate.estimate
    ? estimate.estimate.suppliesCost
    : calculateSuppliesSubtotal(estimate.selectedSupplies);

  const formattedHourlyRate = estimate.estimate
    ? formatCurrency(estimate.estimate.hourlyRateUsed, locale)
    : '';

  const laborCalculation =
    estimate.estimate && estimate.estimate.durationMinutes > 0
      ? formatLaborCalculation(
          estimate.estimate.durationMinutes,
          formattedHourlyRate,
        )
      : undefined;

  const texts: ProcedureEstimateTexts = {
    optionalBadge: t('pricing.procedureEstimate.optionalBadge'),
    durationTitle: t('pricing.procedureEstimate.duration.title'),
    durationSupportText: t('pricing.procedureEstimate.duration.supportText'),
    hoursLabel: t('pricing.procedureEstimate.duration.hours'),
    minutesLabel: t('pricing.procedureEstimate.duration.minutes'),
    hoursPlaceholder: t('pricing.procedureEstimate.duration.hoursPlaceholder'),
    minutesPlaceholder: t(
      'pricing.procedureEstimate.duration.minutesPlaceholder',
    ),
    clientTitle: t('pricing.procedureEstimate.client.title'),
    clientSupportText: t('pricing.procedureEstimate.client.supportText'),
    clientPlaceholder: t('pricing.procedureEstimate.client.placeholder'),
    clientHelperText: t('pricing.procedureEstimate.client.helperText'),
    clientTripEstimateLabel: t(
      'pricing.procedureEstimate.client.tripEstimateLabel',
    ),
    clientTripNotIncluded: t(
      'pricing.procedureEstimate.client.tripNotIncluded',
    ),
    clearClientLabel: t('pricing.procedureEstimate.client.clear'),
    clientAutocompleteMessages: {
      empty: t('pricing.procedureEstimate.client.empty'),
      error: t('pricing.procedureEstimate.client.error'),
      loading: t('pricing.procedureEstimate.client.loading'),
    },
    suppliesTitle: t('pricing.procedureEstimate.supplies.title'),
    suppliesSupportText: t('pricing.procedureEstimate.supplies.supportText'),
    addSupplyLabel: t('pricing.procedureEstimate.supplies.add'),
    suppliesHelperText: t('pricing.procedureEstimate.supplies.helperText'),
    suppliesSubtotalLabel: t('pricing.procedureEstimate.supplies.subtotalLabel'),
    noSuppliesMessage: t('pricing.procedureEstimate.supplies.empty'),
    editSupplyLabel: t('pricing.procedureEstimate.supplies.edit'),
    removeSupplyLabel: t('pricing.procedureEstimate.supplies.remove'),
    suppliesUnits: t('pricing.procedureEstimate.supplies.units'),
    unconfiguredTitle: t('pricing.procedureEstimate.unconfigured.title'),
    unconfiguredMessage: t('pricing.procedureEstimate.unconfigured.message'),
    unconfiguredFootnote: t('pricing.procedureEstimate.unconfigured.footnote'),
    configurePricingLabel: t('pricing.procedureEstimate.unconfigured.action'),
    saveSimulationLabel: t('pricing.procedureEstimate.actions.save'),
    saveSimulationSuccess: t('pricing.procedureEstimate.actions.savedSuccess'),
    clearFieldsLabel: t('pricing.procedureEstimate.actions.clear'),
    resultTexts: {
      title: t('pricing.procedureEstimate.result.title'),
      laborLabel: t('pricing.procedureEstimate.result.laborLabel'),
      tripLabel: t('pricing.procedureEstimate.result.tripLabel'),
      suppliesLabel: t('pricing.procedureEstimate.result.suppliesLabel'),
      totalLabel: t('pricing.procedureEstimate.result.totalLabel'),
      infoText: t('pricing.procedureEstimate.result.infoText'),
      idleMessage: t('pricing.procedureEstimate.result.idle'),
      loadingMessage: t('pricing.procedureEstimate.result.loading'),
      errorMessage: t('pricing.procedureEstimate.result.error'),
      retryLabel: t('pricing.procedureEstimate.result.retry'),
      breakEvenLabel: t('pricing.procedureEstimate.result.breakEven'),
    },
  };

  return (
    <>
      <View className="gap-0.5 px-[18px] pb-2 pt-0">
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel={t('pricing.procedureEstimate.back')}
            hitSlop={8}
            className="-ml-1 p-1 active:opacity-70"
          >
            <Icon
              as={ChevronLeft}
              size={26}
              className="text-label-quartenery"
            />
          </Pressable>

          <Text
            accessibilityRole="header"
            className="text-2xl font-bold tracking-tight text-label-quartenery"
          >
            {t(
              isConfiguringPricing
                ? 'pricing.setup.title'
                : 'pricing.procedureEstimate.title',
            )}
          </Text>
        </View>

        <Text className="pl-7 text-xs text-label-muted">
          {t(
            isConfiguringPricing
              ? 'pricing.setup.subtitle'
              : 'pricing.procedureEstimate.subtitle',
          )}
        </Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerClassName="gap-3 px-[18px] pb-10 pt-2.5"
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
            onEditSupply={handleEditSupply}
            onRemoveSupply={estimate.removeSupply}
            formatSupplyCost={cost => formatCurrency(cost, locale)}
            formattedSuppliesSubtotal={formatCurrency(
              suppliesSubtotalValue,
              locale,
            )}
            status={estimate.status}
            estimate={estimate.estimate}
            canSave={estimate.canSave}
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
            formattedHourlyRate={formattedHourlyRate}
            formattedDuration={
              estimate.estimate
                ? formatDurationDisplay(estimate.estimate.durationMinutes)
                : ''
            }
            laborCalculation={laborCalculation}
            onRetry={estimate.retry}
            onConfigurePricing={() => setIsConfiguringPricing(true)}
            onSaveSimulation={handleSaveSimulation}
            onClearFields={handleClearFields}
            isSavedToastVisible={isSavedToastVisible}
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

      {/* Modal para edição de quantidade de um insumo */}
      <EditSupplyQuantityModal
        visible={editingSupply !== null}
        supply={editingSupply}
        onConfirm={handleConfirmEditSupply}
        onClose={() => setEditingSupply(null)}
        title={t('pricing.procedureEstimate.editQuantity.title')}
        confirmLabel={t('pricing.procedureEstimate.editQuantity.confirm')}
        cancelLabel={t('pricing.procedureEstimate.editQuantity.cancel')}
      />
    </>
  );
}
