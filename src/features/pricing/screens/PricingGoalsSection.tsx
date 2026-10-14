import { useTranslation } from 'shared/i18n';

import { PricingSettingsForm } from '../components/PricingSettingsForm';
import type { PricingSettingsField } from '../domain/pricing.types';
import { PRICING_SETTINGS_FIELDS } from '../domain/validatePricingSettings';
import { usePricingSettingsForm } from '../hooks/usePricingSettingsForm';

export function PricingGoalsSection() {
  const { t } = useTranslation();
  const form = usePricingSettingsForm();

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
