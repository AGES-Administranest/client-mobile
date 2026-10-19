import { useTranslation } from 'shared/i18n';

import { PricingSettingsForm } from '../components/PricingSettingsForm';
import type {
  PricingSettings,
  PricingSettingsField,
} from '../domain/pricing.types';
import { PRICING_SETTINGS_FIELDS } from '../domain/validatePricingSettings';
import type { UsePricingSettings } from '../hooks/usePricingSettings';
import { usePricingSettingsForm } from '../hooks/usePricingSettingsForm';

type PricingGoalsSectionProps = {
  pricing: UsePricingSettings;
};

// Waits for the saved goals before mounting the form, so it opens filled in.
// While loading or after a failure the onboarding section below the fixed
// costs shows the spinner or the retry, and an empty form here could
// overwrite goals that were only not loaded.
export function PricingGoalsSection({ pricing }: PricingGoalsSectionProps) {
  const { state, applySaved } = pricing;

  if (state.status === 'loading' || state.status === 'error') {
    return null;
  }

  return (
    <PricingGoalsForm
      initialSettings={state.status === 'configured' ? state.settings : null}
      onSaved={applySaved}
    />
  );
}

type PricingGoalsFormProps = {
  initialSettings: PricingSettings | null;
  onSaved: (settings: PricingSettings) => void;
};

function PricingGoalsForm({ initialSettings, onSaved }: PricingGoalsFormProps) {
  const { t } = useTranslation();
  const form = usePricingSettingsForm({ initialSettings, onSaved });

  const fieldErrors: Partial<Record<PricingSettingsField, string>> = {};
  for (const field of PRICING_SETTINGS_FIELDS) {
    const code = form.errors[field];
    if (code) fieldErrors[field] = t(`pricing.goalForm.errors.${code}`);
  }

  return (
    <PricingSettingsForm
      draft={form.draft}
      fieldErrors={fieldErrors}
      failureMessage={form.failure ? t(form.failure) : null}
      isSaving={form.isSaving}
      texts={{
        title: t('pricing.goalForm.title'),
        labels: {
          monthlyIncomeGoal: t('pricing.goalForm.labels.monthlyIncomeGoal'),
          weeklyHours: t('pricing.goalForm.labels.weeklyHours'),
          safetyMarginPct: t('pricing.goalForm.labels.safetyMarginPct'),
        },
        weeklyHoursHint: t('pricing.goalForm.weeklyHoursHint'),
        saveLabel: t('pricing.goalForm.save'),
        savingLabel: t('pricing.goalForm.saving'),
      }}
      onChangeField={form.setField}
      onSubmit={form.submit}
    />
  );
}
