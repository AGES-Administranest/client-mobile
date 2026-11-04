import {
  Car,
  ChevronDown,
  Info,
  MapPin,
  Pencil,
  Trash2,
  X,
} from 'lucide-react-native';
import { ActivityIndicator, Pressable, View } from 'react-native';

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
import { LabelQuartenery } from 'theme/colors';

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
  optionalBadge: string;
  durationTitle: string;
  durationSupportText: string;
  hoursLabel: string;
  minutesLabel: string;
  hoursPlaceholder: string;
  minutesPlaceholder: string;
  clientTitle: string;
  clientSupportText: string;
  clientPlaceholder: string;
  clientHelperText: string;
  clientTripEstimateLabel: string;
  clientTripNotIncluded: string;
  clearClientLabel: string;
  clientAutocompleteMessages: ClientAutocompleteMessages;
  suppliesTitle: string;
  suppliesSupportText: string;
  addSupplyLabel: string;
  suppliesHelperText: string;
  suppliesSubtotalLabel: string;
  noSuppliesMessage: string;
  editSupplyLabel: string;
  removeSupplyLabel: string;
  suppliesUnits: string;
  unconfiguredTitle: string;
  unconfiguredMessage: string;
  unconfiguredFootnote: string;
  configurePricingLabel: string;
  saveSimulationLabel: string;
  saveSimulationSuccess: string;
  clearFieldsLabel: string;
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
  onEditSupply: (supply: ProcedureSelectedSupply) => void;
  onRemoveSupply: (itemId: string) => void;
  formatSupplyCost: (cost: number) => string;
  formattedSuppliesSubtotal: string;

  // Estado e Resultado
  status: 'idle' | 'loading' | 'success' | 'error' | 'needsPricingSetup';
  estimate: ProcedureEstimate | null;
  canSave: boolean;
  formattedMinimumPrice: string;
  formattedBreakEvenPrice: string;
  formattedHoursCost: string;
  formattedTripCost: string;
  formattedSuppliesCost: string;
  formattedHourlyRate: string;
  formattedDuration: string;
  laborCalculation?: string;
  onRetry: () => void;
  onConfigurePricing: () => void;

  // Ações do rodapé
  onSaveSimulation: () => void;
  onClearFields: () => void;
  isSavedToastVisible?: boolean;

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
  onEditSupply,
  onRemoveSupply,
  formatSupplyCost,
  formattedSuppliesSubtotal,
  status,
  estimate,
  canSave,
  formattedMinimumPrice,
  formattedBreakEvenPrice,
  formattedHoursCost,
  formattedTripCost,
  formattedSuppliesCost,
  formattedHourlyRate,
  formattedDuration,
  laborCalculation,
  onRetry,
  onConfigurePricing,
  onSaveSimulation,
  onClearFields,
  isSavedToastVisible,
  texts,
  className,
}: ProcedureEstimateContentProps) {
  const hasTripEstimate = Boolean(
    selectedClient && estimate && estimate.tripEstimateAvailable,
  );
  const isTripNotIncluded = Boolean(
    selectedClient &&
      estimate &&
      !estimate.tripEstimateAvailable &&
      status !== 'loading',
  );

  return (
    <View className={cn('gap-4', className)}>
      {/* Toast de sucesso ao salvar simulação */}
      {isSavedToastVisible ? (
        <View className="flex-row items-center gap-2 rounded-xl border border-details-finish bg-details-finish/20 px-4 py-3">
          <Text className="text-xs font-semibold text-label-body">
            {texts.saveSimulationSuccess}
          </Text>
        </View>
      ) : null}

      {/* 1. Card: Duração do procedimento */}
      <DurationInput
        hours={hours}
        minutes={minutes}
        error={durationError}
        onChangeHours={onChangeHours}
        onChangeMinutes={onChangeMinutes}
        title={texts.durationTitle}
        supportText={texts.durationSupportText}
        hoursLabel={texts.hoursLabel}
        minutesLabel={texts.minutesLabel}
        hoursPlaceholder={texts.hoursPlaceholder}
        minutesPlaceholder={texts.minutesPlaceholder}
      />

      {/* 2. Card: Local do atendimento */}
      <Card className="gap-2 rounded-2xl border border-border-warm/40 bg-white p-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Text
            accessibilityRole="header"
            className="text-sm font-bold text-label-body"
          >
            {texts.clientTitle}
          </Text>
          <View className="rounded-md bg-details-warm px-2 py-0.5">
            <Text className="text-xs font-medium text-label-muted">
              {texts.optionalBadge}
            </Text>
          </View>
        </View>

        <Text className="text-xs text-label-muted">
          {texts.clientSupportText}
        </Text>

        {/* Seletor do tomador */}
        <View className="pt-1">
          {selectedClient ? (
            <View className="h-12 flex-row items-center justify-between rounded-xl border border-border-warm bg-white px-3.5">
              <View className="flex-1 flex-row items-center gap-2">
                <Icon as={MapPin} size={16} className="text-label-quartenery" />
                <Text
                  numberOfLines={1}
                  className="flex-1 text-xs font-medium text-label-body"
                >
                  {selectedClient.name}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={texts.clearClientLabel}
                onPress={onClearClient}
                hitSlop={8}
                className="p-1"
              >
                <Icon as={X} size={16} className="text-label-muted" />
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
              trailingIcon={ChevronDown}
              compact
              onChangeText={onChangeClientTerm}
              onSelect={onSelectClient}
            />
          )}
        </View>

        {/* Texto de apoio */}
        <Text className="text-xs text-label-muted">
          {texts.clientHelperText}
        </Text>

        {/* Caixa de Custo de Deslocamento */}
        {selectedClient ? (
          status === 'loading' ? (
            <View className="mt-2 flex-row items-center justify-center gap-2 rounded-xl bg-details-warm p-3">
              <ActivityIndicator size="small" color={LabelQuartenery} />
              <Text className="text-xs text-label-muted">
                {texts.clientTripEstimateLabel}
              </Text>
            </View>
          ) : hasTripEstimate ? (
            <View className="mt-2 flex-row items-center gap-3 rounded-xl bg-details-warm p-3">
              <Icon as={Car} size={18} className="text-label-quartenery" />
              <View className="flex-1">
                <Text className="text-xs text-label-muted">
                  {texts.clientTripEstimateLabel}
                </Text>
                <Text className="text-sm font-bold text-label-body">
                  {formattedTripCost}
                </Text>
              </View>
            </View>
          ) : isTripNotIncluded ? (
            <View className="mt-2 flex-row items-start gap-2.5 rounded-xl bg-details-warm p-3">
              <Icon
                as={Info}
                size={15}
                className="mt-0.5 text-label-quartenery"
              />
              <Text className="flex-1 text-xs leading-4 text-label-body">
                {texts.clientTripNotIncluded}
              </Text>
            </View>
          ) : null
        ) : null}
      </Card>

      {/* 3. Card: Insumos previstos */}
      <Card className="gap-2 rounded-2xl border border-border-warm/40 bg-white p-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <Text
            accessibilityRole="header"
            className="text-sm font-bold text-label-body"
          >
            {texts.suppliesTitle}
          </Text>
          <View className="rounded-md bg-details-warm px-2 py-0.5">
            <Text className="text-xs font-medium text-label-muted">
              {texts.optionalBadge}
            </Text>
          </View>
        </View>

        <Text className="text-xs text-label-muted">
          {texts.suppliesSupportText}
        </Text>

        {/* Lista de insumos adicionados */}
        {supplies.length > 0 ? (
          <View className="pt-1">
            {supplies.map(supply => (
              <View
                key={supply.itemId}
                className="border-b border-border-warm/40 pb-2.5 pt-2"
              >
                {/* Linha superior: Nome e Ações */}
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-bold text-label-body">
                    {supply.name}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={texts.editSupplyLabel}
                      onPress={() => onEditSupply(supply)}
                      hitSlop={8}
                      className="p-1"
                    >
                      <Icon as={Pencil} size={14} className="text-label-muted" />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={texts.removeSupplyLabel}
                      onPress={() => onRemoveSupply(supply.itemId)}
                      hitSlop={8}
                      className="p-1"
                    >
                      <Icon as={Trash2} size={14} className="text-label-muted" />
                    </Pressable>
                  </View>
                </View>

                {/* Linha inferior: Quantidade × Unitário e Total da Linha */}
                <View className="flex-row items-center justify-between pt-0.5">
                  <Text className="text-xs text-label-muted">
                    {supply.quantity}{' '}
                    {supply.unit ? supply.unit : texts.suppliesUnits} ×{' '}
                    {formatSupplyCost(supply.unitCost)}
                  </Text>
                  <Text className="text-xs font-bold text-label-body">
                    {formatSupplyCost(supply.quantity * supply.unitCost)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Botão + Adicionar insumo */}
        <Pressable
          accessibilityRole="button"
          onPress={onOpenSupplySelector}
          className="my-2 h-11 items-center justify-center rounded-full bg-details-warm active:opacity-80"
        >
          <Text className="text-xs font-semibold text-label-body">
            {texts.addSupplyLabel}
          </Text>
        </Pressable>

        {/* Texto informativo */}
        <Text className="text-center text-xs text-label-muted">
          {texts.suppliesHelperText}
        </Text>

        {/* Subtotal dos insumos */}
        <View className="flex-row items-center justify-between pt-1">
          <Text className="text-xs font-semibold text-label-body">
            {texts.suppliesSubtotalLabel}
          </Text>
          <Text className="text-xs font-bold text-label-body">
            {formattedSuppliesSubtotal}
          </Text>
        </View>
      </Card>

      {/* 4. Card: Valor mínimo sugerido (Imagem 1) OU Configure seu valor por hora (Imagem 2) */}
      {status === 'needsPricingSetup' ? (
        <PricingSetupRequired
          title={texts.unconfiguredTitle}
          message={texts.unconfiguredMessage}
          footnote={texts.unconfiguredFootnote}
          buttonLabel={texts.configurePricingLabel}
          onConfigure={onConfigurePricing}
        />
      ) : (
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
          laborCalculation={laborCalculation}
          hasClient={Boolean(selectedClient)}
          onRetry={onRetry}
          texts={texts.resultTexts}
        />
      )}

      {/* Rodapé: Botões de Ação */}
      <View className="gap-2 pt-2">
        {/* Botão principal: Salvar simulação */}
        <Pressable
          accessibilityRole="button"
          disabled={!canSave}
          onPress={onSaveSimulation}
          className={cn(
            'h-12 items-center justify-center rounded-full bg-button-primary active:opacity-90',
            !canSave && 'opacity-40',
          )}
        >
          <Text className="text-sm font-semibold text-label-secondary">
            {texts.saveSimulationLabel}
          </Text>
        </Pressable>

        {/* Botão secundário: Limpar campos */}
        <Pressable
          accessibilityRole="button"
          onPress={onClearFields}
          className="h-12 items-center justify-center rounded-full border border-border-warm bg-transparent active:opacity-80"
        >
          <Text className="text-sm font-semibold text-label-body">
            {texts.clearFieldsLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
