// LAYOUT PROVISÓRIO: aguardando protótipo do Figma
import { Plus, Trash2, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import {
  ClientAutocomplete,
  type ClientAutocompleteMessages,
  type ClientOption,
  type ClientSearchStatus,
} from 'features/clients';

import { DurationInput } from './DurationInput';
import {
  EstimateResultCard,
  type EstimateResultTexts,
} from './EstimateResultCard';
import { PricingSetupRequired } from './PricingSetupRequired';
import type {
  ProcedureEstimate,
  ProcedureSelectedSupply,
} from '../domain/pricing.types';

export type ProcedureEstimateTexts = {
  durationTitle: string;
  hoursLabel: string;
  minutesLabel: string;
  hoursPlaceholder: string;
  minutesPlaceholder: string;
  clientTitle: string;
  clientPlaceholder: string;
  clearClientLabel: string;
  clientAutocompleteMessages: ClientAutocompleteMessages;
  suppliesTitle: string;
  addSupplyLabel: string;
  noSuppliesMessage: string;
  removeSupplyLabel: string;
  unconfiguredTitle: string;
  unconfiguredMessage: string;
  configurePricingLabel: string;
  resultTexts: EstimateResultTexts;
};

export type ProcedureEstimateContentProps = {
  // Duração
  hours: string;
  minutes: string;
  durationError?: string | null;
  onChangeHours: (hours: string) => void;
  onChangeMinutes: (minutes: string) => void;

  // Tomador / Clínica
  selectedClient: ClientOption | null;
  clientTerm: string;
  clientSearchStatus: ClientSearchStatus;
  clientOptions: ClientOption[];
  onChangeClientTerm: (term: string) => void;
  onSelectClient: (client: ClientOption) => void;
  onClearClient: () => void;

  // Insumos
  supplies: ProcedureSelectedSupply[];
  onOpenSupplySelector: () => void;
  onRemoveSupply: (itemId: string) => void;
  formatSupplyCost: (cost: number) => string;

  // Estado e Resultado
  status: 'idle' | 'loading' | 'success' | 'error' | 'needsPricingSetup';
  estimate: ProcedureEstimate | null;
  formattedMinimumPrice: string;
  formattedBreakEvenPrice: string;
  formattedHoursCost: string;
  formattedTripCost: string;
  formattedSuppliesCost: string;
  formattedHourlyRate: string;
  formattedDuration: string;
  onRetry: () => void;
  onConfigurePricing: () => void;

  // Textos
  texts: ProcedureEstimateTexts;
  className?: string;
};

export function ProcedureEstimateContent({
  hours,
  minutes,
  durationError,
  onChangeHours,
  onChangeMinutes,
  selectedClient,
  clientTerm,
  clientSearchStatus,
  clientOptions,
  onChangeClientTerm,
  onSelectClient,
  onClearClient,
  supplies,
  onOpenSupplySelector,
  onRemoveSupply,
  formatSupplyCost,
  status,
  estimate,
  formattedMinimumPrice,
  formattedBreakEvenPrice,
  formattedHoursCost,
  formattedTripCost,
  formattedSuppliesCost,
  formattedHourlyRate,
  formattedDuration,
  onRetry,
  onConfigurePricing,
  texts,
  className,
}: ProcedureEstimateContentProps) {
  // Quando falta configuração de honorários (409 ou PRICING_SETTINGS_NOT_FOUND)
  if (status === 'needsPricingSetup') {
    return (
      <View className={cn('gap-4', className)}>
        <PricingSetupRequired
          title={texts.unconfiguredTitle}
          message={texts.unconfiguredMessage}
          buttonLabel={texts.configurePricingLabel}
          onConfigure={onConfigurePricing}
        />
      </View>
    );
  }

  return (
    <View className={cn('gap-4', className)}>
      {/* 1. Duração Estimada */}
      <DurationInput
        hours={hours}
        minutes={minutes}
        error={durationError}
        onChangeHours={onChangeHours}
        onChangeMinutes={onChangeMinutes}
        title={texts.durationTitle}
        hoursLabel={texts.hoursLabel}
        minutesLabel={texts.minutesLabel}
        hoursPlaceholder={texts.hoursPlaceholder}
        minutesPlaceholder={texts.minutesPlaceholder}
      />

      {/* 2. Tomador ou Clínica (Opcional) */}
      <Card className="gap-2.5 rounded-[14px] p-4 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]">
        <Text
          accessibilityRole="header"
          className="text-xs font-semibold uppercase tracking-wider text-label-primary"
        >
          {texts.clientTitle}
        </Text>

        {selectedClient ? (
          <View className="flex-row items-center justify-between rounded-[10px] bg-details-warm px-3 py-2.5">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-label-primary">
                {selectedClient.name}
              </Text>
            </View>
            <Pressable
              role="button"
              accessibilityLabel={texts.clearClientLabel}
              onPress={onClearClient}
              hitSlop={8}
              className="p-1"
            >
              <Icon as={X} size={18} className="text-label-muted" />
            </Pressable>
          </View>
        ) : (
          <ClientAutocomplete
            label=""
            placeholder={texts.clientPlaceholder}
            value={clientTerm}
            status={clientSearchStatus}
            options={clientOptions}
            messages={texts.clientAutocompleteMessages}
            onChangeText={onChangeClientTerm}
            onSelect={onSelectClient}
          />
        )}
      </Card>

      {/* 3. Insumos Previstos (Opcional) */}
      <Card className="gap-3 rounded-[14px] p-4 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]">
        <View className="flex-row items-center justify-between">
          <Text
            accessibilityRole="header"
            className="text-xs font-semibold uppercase tracking-wider text-label-primary"
          >
            {texts.suppliesTitle}
          </Text>
          <Button
            shape="pill"
            variant="outline"
            onPress={onOpenSupplySelector}
            className="h-8 px-3"
          >
            <Icon as={Plus} size={14} className="mr-1 text-label-primary" />
            <Text className="text-xs font-semibold text-label-primary">
              {texts.addSupplyLabel}
            </Text>
          </Button>
        </View>

        {supplies.length === 0 ? (
          <Text className="py-1 text-xs text-label-muted">
            {texts.noSuppliesMessage}
          </Text>
        ) : (
          <View className="gap-2 pt-1">
            {supplies.map(supply => (
              <View
                key={supply.itemId}
                className="flex-row items-center justify-between rounded-[10px] bg-details-warm px-3 py-2"
              >
                <View className="flex-1 gap-0.5">
                  <Text className="text-xs font-semibold text-label-primary">
                    {supply.name}
                  </Text>
                  <Text className="text-[11px] text-label-muted">
                    {supply.quantity} {supply.unit} ×{' '}
                    {formatSupplyCost(supply.unitCost)}
                  </Text>
                </View>

                <View className="flex-row items-center gap-3">
                  <Text className="text-xs font-bold text-label-primary">
                    {formatSupplyCost(supply.quantity * supply.unitCost)}
                  </Text>
                  <Pressable
                    role="button"
                    accessibilityLabel={texts.removeSupplyLabel}
                    onPress={() => onRemoveSupply(supply.itemId)}
                    hitSlop={8}
                    className="p-1"
                  >
                    <Icon as={Trash2} size={16} className="text-label-muted" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* 4. Resultado da Simulação */}
      <EstimateResultCard
        status={status}
        estimate={estimate}
        formattedMinimumPrice={formattedMinimumPrice}
        formattedBreakEvenPrice={formattedBreakEvenPrice}
        formattedHoursCost={formattedHoursCost}
        formattedTripCost={formattedTripCost}
        formattedSuppliesCost={formattedSuppliesCost}
        formattedHourlyRate={formattedHourlyRate}
        formattedDuration={formattedDuration}
        hasClient={Boolean(selectedClient)}
        onRetry={onRetry}
        texts={texts.resultTexts}
      />
    </View>
  );
}
