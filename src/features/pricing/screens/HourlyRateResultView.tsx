import { useState } from 'react';

import { Card } from 'app/components/ui/card';
import { FixedCostsSection } from 'features/calculator';
import { MonthSelector } from 'shared/components/MonthSelector';
import { useTranslation } from 'shared/i18n';
import { formatCurrency } from 'shared/utils/currency';
import {
  formatMonthLabel,
  relativeMonth,
  shiftMonth,
  type MonthPeriod,
} from 'shared/utils/monthPeriod';

import { HourlyRateBreakdown } from '../components/HourlyRateBreakdown';
import { HourlyRateHighlight } from '../components/HourlyRateHighlight';
import { PricingSettingsForm } from '../components/PricingSettingsForm';
import {
  HOURLY_RATE_PARTS,
  percentShares,
  shareOfTotal,
  type HourlyRate,
} from '../domain/hourlyRate';
import type { PricingSettingsField } from '../domain/pricing.types';
import { PRICING_SETTINGS_FIELDS } from '../domain/validatePricingSettings';
import { usePricingSettingsForm } from '../hooks/usePricingSettingsForm';

type HourlyRateResultViewProps = {
  month: MonthPeriod;
  onMonthChange: (month: MonthPeriod) => void;
  hourlyRate: HourlyRate;
  isRefreshing: boolean;
  onChanged: () => void;
  onOpenFixedCosts: () => void;
};

export function HourlyRateResultView({
  month,
  onMonthChange,
  hourlyRate,
  isRefreshing,
  onChanged,
  onOpenFixedCosts,
}: HourlyRateResultViewProps) {
  const { t, locale } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const form = usePricingSettingsForm({
    initialSettings: hourlyRate.settings,
    onSaved: onChanged,
  });

  const money = (value: number) => formatCurrency(value, locale);
  const number = (value: number, fractionDigits: number) =>
    value.toLocaleString(locale, { maximumFractionDigits: fractionDigits });
  const margin = number(hourlyRate.settings.safetyMarginPct, 2);
  const calculatedAt = new Date(hourlyRate.calculatedAt);
  const relative = relativeMonth(month, new Date());

  const fieldErrors: Partial<Record<PricingSettingsField, string>> = {};
  for (const field of PRICING_SETTINGS_FIELDS) {
    const code = form.errors[field];
    if (code) fieldErrors[field] = t(`pricing.goalForm.errors.${code}`);
  }

  const percents = percentShares(
    HOURLY_RATE_PARTS.map(part => hourlyRate.parts[part]),
  );
  const rows = HOURLY_RATE_PARTS.map((part, index) => {
    const share = shareOfTotal(hourlyRate.parts[part], hourlyRate.total);
    return {
      part,
      label: t(`pricing.hourlyRate.breakdown.parts.${part}.label`),
      caption: t(`pricing.hourlyRate.breakdown.parts.${part}.caption`, {
        margin,
      }),
      value: money(hourlyRate.parts[part]),
      share,
      shareLabel: t('pricing.hourlyRate.breakdown.shareOfTotal', {
        share: percents[index].toLocaleString(locale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
      }),
    };
  });

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
        title={t('pricing.hourlyRate.title')}
        marginLabel={t('pricing.hourlyRate.marginChip', { margin })}
        value={money(hourlyRate.hourlyRate)}
        valueAccessibilityLabel={t('pricing.hourlyRate.valueLabel', {
          value: money(hourlyRate.hourlyRate),
        })}
        description={t('pricing.hourlyRate.description')}
        minimum={{
          label: t('pricing.hourlyRate.minimum'),
          value: money(hourlyRate.minimumHourlyRate),
        }}
        productiveHours={{
          label: t('pricing.hourlyRate.productiveHours'),
          value: t('pricing.hourlyRate.hoursValue', {
            hours: number(hourlyRate.productiveHours, 1),
          }),
        }}
        updatedAt={t('pricing.hourlyRate.updatedAt', {
          date: calculatedAt.toLocaleDateString(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          time: calculatedAt.toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit',
          }),
        })}
        isRefreshing={isRefreshing}
        refreshingLabel={t('pricing.hourlyRate.refreshing')}
        toggleLabel={t(
          isExpanded
            ? 'pricing.hourlyRate.hideBreakdown'
            : 'pricing.hourlyRate.showBreakdown',
        )}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(expanded => !expanded)}
      >
        <HourlyRateBreakdown
          title={t('pricing.hourlyRate.breakdown.title')}
          rows={rows}
          explanationTitle={t('pricing.hourlyRate.breakdown.explanationTitle')}
          explanation={t('pricing.hourlyRate.breakdown.explanation')}
        />
      </HourlyRateHighlight>

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

      <FixedCostsSection
        period={month}
        onSaved={onChanged}
        onOpenList={onOpenFixedCosts}
      />
    </>
  );
}
