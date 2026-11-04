import { SlidersHorizontal } from 'lucide-react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { FixedCostsSection } from 'features/calculator';
import { useTranslation } from 'shared/i18n';
import type { MonthPeriod } from 'shared/utils/monthPeriod';

import { PricingSettingsForm } from '../components/PricingSettingsForm';
import type { PricingSettingsField } from '../domain/pricing.types';
import { PRICING_SETTINGS_FIELDS } from '../domain/validatePricingSettings';
import { usePricingSettingsForm } from '../hooks/usePricingSettingsForm';

type PricingSetupViewProps = {
  month: MonthPeriod;
  onSaved: () => void;
};

// The "Configurar honorários" frame, opened from the initial state.
export function PricingSetupView({ month, onSaved }: PricingSetupViewProps) {
  const { t } = useTranslation();
  const form = usePricingSettingsForm();

  const fieldErrors: Partial<Record<PricingSettingsField, string>> = {};
  for (const field of PRICING_SETTINGS_FIELDS) {
    const code = form.errors[field];
    if (code) fieldErrors[field] = t(`pricing.goalForm.errors.${code}`);
  }

  const saveAndCalculate = async () => {
    if (await form.submit()) onSaved();
  };

  return (
    <>
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
          hints: {
            monthlyIncomeGoal: t('pricing.setup.hints.monthlyIncomeGoal'),
            weeklyHours: t('pricing.setup.hints.weeklyHours'),
            safetyMarginPct: t('pricing.setup.hints.safetyMarginPct'),
          },
          placeholders: {
            monthlyIncomeGoal: t(
              'pricing.setup.placeholders.monthlyIncomeGoal',
            ),
            weeklyHours: t('pricing.setup.placeholders.weeklyHours'),
            safetyMarginPct: t('pricing.setup.placeholders.safetyMarginPct'),
          },
        }}
        onChangeField={form.setField}
      />

      <FixedCostsSection period={month} />

      <Button
        shape="pill"
        onPress={saveAndCalculate}
        disabled={form.isSaving}
        className="h-[49px] w-full bg-button-primary px-6"
      >
        <Icon
          as={SlidersHorizontal}
          size={16}
          className="text-label-secondary"
        />
        <Text className="text-[15px] font-medium leading-[21px] text-label-secondary">
          {t(form.isSaving ? 'pricing.setup.saving' : 'pricing.setup.save')}
        </Text>
      </Button>

      <Text className="text-center text-[11px] leading-[16.5px] text-label-muted">
        {t('pricing.setup.footnote')}
      </Text>
    </>
  );
}
