import { FileText, Receipt } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { ReportKindCard } from '../components/ReportKindCard';
import { ReportPeriodSelector } from '../components/ReportPeriodSelector';
import { ReportsHistoryLink } from '../components/ReportsHistoryLink';
import { formatReportDate, type ReportKind } from '../domain/reportPeriod';
import { useReportsScreen } from '../hooks/useReportsScreen';

const KIND_ICONS = { general: FileText, invoicePackage: Receipt } as const;
const KINDS = Object.keys(KIND_ICONS) as ReportKind[];

export type ReportsScreenProps = {
  onGenerateReport?: (
    kind: ReportKind,
    period: { from: string; to: string },
  ) => void;
  onOpenHistory?: () => void;
};

export function ReportsScreen({
  onGenerateReport,
  onOpenHistory,
}: ReportsScreenProps) {
  const { t, locale } = useTranslation();
  const { range, setRange, isCalendarOpen, toggleCalendar, canGenerate } =
    useReportsScreen();

  const periodLabel =
    range.from !== null && range.to !== null
      ? t('reports.period.range', {
          from: formatReportDate(range.from, locale),
          to: formatReportDate(range.to, locale),
        })
      : t('reports.period.incomplete');

  const generate = (kind: ReportKind) => {
    if (range.from !== null && range.to !== null) {
      onGenerateReport?.(kind, { from: range.from, to: range.to });
    }
  };

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-6 px-4 pb-6 pt-3"
      keyboardShouldPersistTaps="handled"
    >
      <Text
        accessibilityRole="header"
        className="text-[40px] font-medium leading-[48px] text-label-primary"
      >
        {t('reports.title')}
      </Text>

      <View className="gap-3">
        <Text
          accessibilityRole="header"
          className="text-sm font-semibold uppercase text-label-primary"
        >
          {t('reports.generate.title')}
        </Text>
        <ReportPeriodSelector
          label={t('reports.period.label')}
          periodLabel={periodLabel}
          range={range}
          onRangeChange={setRange}
          isCalendarOpen={isCalendarOpen}
          onToggleCalendar={toggleCalendar}
          locale={locale}
          previousMonthLabel={t('reports.period.previousMonth')}
          nextMonthLabel={t('reports.period.nextMonth')}
        />
        {KINDS.map(kind => (
          <ReportKindCard
            key={kind}
            icon={KIND_ICONS[kind]}
            title={t(`reports.kinds.${kind}.title`)}
            description={t(`reports.kinds.${kind}.description`)}
            disabled={!canGenerate}
            onPress={() => generate(kind)}
          />
        ))}
      </View>

      <ReportsHistoryLink
        title={t('reports.history.title')}
        actionLabel={t('reports.history.viewAll')}
        onPress={() => onOpenHistory?.()}
      />
    </ScrollView>
  );
}
