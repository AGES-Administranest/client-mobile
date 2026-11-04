export { HourlyRateScreen } from './screens/HourlyRateScreen';
export { HourlyRateBreakdown } from './components/HourlyRateBreakdown';
export type {
  HourlyRateBreakdownProps,
  HourlyRateBreakdownRow,
} from './components/HourlyRateBreakdown';
export { HourlyRateHighlight } from './components/HourlyRateHighlight';
export type { HourlyRateHighlightProps } from './components/HourlyRateHighlight';
export { PricingOnboarding } from './components/PricingOnboarding';
export type { PricingOnboardingProps } from './components/PricingOnboarding';
export { PricingSettingsForm } from './components/PricingSettingsForm';
export type {
  PricingSettingsFormProps,
  PricingSettingsFormTexts,
} from './components/PricingSettingsForm';
export { useHourlyRate } from './hooks/useHourlyRate';
export type { HourlyRateState, UseHourlyRate } from './hooks/useHourlyRate';
export { usePricingSettingsForm } from './hooks/usePricingSettingsForm';
export type { PricingSettingsFormState } from './hooks/usePricingSettingsForm';
export { fetchPricingSettings } from './services/pricingSettingsService';
export {
  pricingService,
  USE_PROCEDURE_ESTIMATE_MOCK,
  isPricingUnconfiguredError,
} from './services/pricingService';
export type { HourlyRate, HourlyRatePart } from './domain/hourlyRate';
export type {
  PricingSettings,
  PricingSettingsErrors,
  PricingSettingsField,
  ProcedureEstimate,
  ProcedureEstimateDto,
  ProcedureEstimateResponse,
  ProcedureSelectedSupply,
  ProcedureSupplyDto,
} from './domain/pricing.types';

// --- US21: Sugestão de Valor Mínimo por Procedimento ---
export { ProcedureEstimateScreen } from './screens/ProcedureEstimateScreen';
export type { ProcedureEstimateScreenProps } from './screens/ProcedureEstimateScreen';
export { ProcedureEstimateContent } from './components/ProcedureEstimateContent';
export type { ProcedureEstimateContentProps } from './components/ProcedureEstimateContent';
export { DurationInput } from './components/DurationInput';
export type { DurationInputProps } from './components/DurationInput';
export { EstimateResultCard } from './components/EstimateResultCard';
export type { EstimateResultCardProps } from './components/EstimateResultCard';
export { PricingSetupRequired } from './components/PricingSetupRequired';
export type { PricingSetupRequiredProps } from './components/PricingSetupRequired';
export { useProcedureEstimate } from './hooks/useProcedureEstimate';
export type {
  ProcedureEstimateStatus,
  UseProcedureEstimate,
} from './hooks/useProcedureEstimate';
export {
  formatDurationDisplay,
  fromDurationMinutes,
  mapProcedureEstimate,
  toDurationMinutes,
  validateDuration,
} from './domain/procedureEstimate';
