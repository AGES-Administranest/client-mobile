import { Calculator } from 'lucide-react-native';
import { useState } from 'react';

import { Button } from 'app/components/ui/button';
import { Card } from 'app/components/ui/card';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { FixedCostsSection } from 'features/calculator';
import { MonthSelector } from 'shared/components/MonthSelector';
import { useTranslation } from 'shared/i18n';
import {
  formatMonthLabel,
  relativeMonth,
  shiftMonth,
  type MonthPeriod,
} from 'shared/utils/monthPeriod';

import {
  hourlyRateBreakdownRows,
  hourlyRateHighlightView,
} from './hourlyRatePresenter';
import { HourlyRateBreakdown } from '../components/HourlyRateBreakdown';
import { HourlyRateHighlight } from '../components/HourlyRateHighlight';
import { PricingSettingsForm } from '../components/PricingSettingsForm';
import type { HourlyRate } from '../domain/hourlyRate';
import type { PricingSettingsField } from '../domain/pricing.types';
import { PRICING_SETTINGS_FIELDS } from '../domain/validatePricingSettings';
import { usePricingSettingsForm } from '../hooks/usePricingSettingsForm';

type HourlyRateResultViewProps = {
  month: MonthPeriod;
  onMonthChange: (month: MonthPeriod) => void;
  hourlyRate: HourlyRate;
  isRefreshing: boolean;
  onChanged: () => void;
  onOpenHistory: () => void;
  onOpenProcedureEstimate?: () => void;
};

export function HourlyRateResultView({
  month,
  onMonthChange,
  hourlyRate,
  isRefreshing,
  onChanged,
  onOpenHistory,
  onOpenProcedureEstimate,
}: HourlyRateResultViewProps) {
  const { t, locale } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const form = usePricingSettingsForm({
    initialSettings: hourlyRate.settings,
    onSaved: onChanged,
  });

  const format = { t, locale };
  const relative = relativeMonth(month, new Date());

  const fieldErrors: Partial<Record<PricingSettingsField, string>> = {};
  for (const field of PRICING_SETTINGS_FIELDS) {
    const code = form.errors[field];
    if (code) fieldErrors[field] = t(`pricing.goalForm.errors.${code}`);
  }

  return (
    <>
      <Card className="rounded-[14px] p-4 shadow-[0px_5px_10px_-3px_rgba(0,0,0,0.1)]">
        <MonthSelector
          label={formatMonthLabel(month, locale)}
          caption={relative ? t(`pricing.hourlyRate.month.${relative}`) : null}
          previousLabel={t('pricing.hourlyRate.month.previousButton')}
          nextLabel={t('pricing.hourlyRate.month.nextButton')}
          onPrevious={() => onMonthChange(shiftMonth(month, -1))}
          onNext={() => onMonthChange(shiftMonth(month, 1))}
        />
      </Card>

      <HourlyRateHighlight
        {...hourlyRateHighlightView(hourlyRate, format)}
        isRefreshing={isRefreshing}
        toggleLabel={t(
          isExpanded
            ? 'pricing.hourlyRate.hideBreakdown'
            : 'pricing.hourlyRate.showBreakdown',
        )}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(expanded => !expanded)}
        historyShortcut={{
          label: t('pricing.history.openShortcut'),
          onPress: onOpenHistory,
        }}
      >
        <HourlyRateBreakdown
          title={t('pricing.hourlyRate.breakdown.title')}
          rows={hourlyRateBreakdownRows(hourlyRate, format)}
          explanationTitle={t('pricing.hourlyRate.breakdown.explanationTitle')}
          explanation={t('pricing.hourlyRate.breakdown.explanation')}
        />
      </HourlyRateHighlight>

      {onOpenProcedureEstimate ? (
        <Button
          shape="pill"
          variant="outline"
          onPress={onOpenProcedureEstimate}
          className="h-12 w-full flex-row items-center justify-center gap-2 border border-button-primary bg-white px-4"
        >
          <Icon as={Calculator} size={18} className="text-button-primary" />
          <Text className="text-sm font-semibold text-button-primary">
            {t('pricing.procedureEstimate.entryButton')}
          </Text>
        </Button>
      ) : null}

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
        }}
        onChangeField={form.setField}
        onBlurField={() => form.submit()}
      />

      <FixedCostsSection period={month} />
    </>
  );
}
