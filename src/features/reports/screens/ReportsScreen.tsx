import { FileText, Plus, Receipt } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { InvoicesScreen, InvoicesSection } from 'features/invoices';
import {
  ServiceInvoiceUploadFlow,
  useServiceInvoiceUpload,
} from 'features/serviceInvoices';
import { useTranslation } from 'shared/i18n';
import { formatShortCalendarDate } from 'shared/utils/calendar';
import { formatDayAndMonth } from 'shared/utils/formatDayAndMonth';

import { ReportCard } from '../components/ReportCard';
import { ReportKindCard } from '../components/ReportKindCard';
import { ReportPeriodSelector } from '../components/ReportPeriodSelector';
import { ReportsHistoryLink } from '../components/ReportsHistoryLink';
import { REPORT_PERIOD_CHOICES, type ReportKind } from '../domain/reportPeriod';
import { useReportHistory } from '../hooks/useReportHistory';
import { useReportsScreen } from '../hooks/useReportsScreen';

const KIND_ICONS = { general: FileText, invoicePackage: Receipt } as const;
const KINDS = Object.keys(KIND_ICONS) as ReportKind[];

const SECTION_TITLE =
  'text-sm font-semibold uppercase tracking-wide text-label-primary';

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
  const history = useReportHistory();
  const invoiceUpload = useServiceInvoiceUpload();
  const { choice, selectChoice, range, setRange, maxDate, canGenerate } =
    useReportsScreen();

  const [isInvoiceListOpen, setIsInvoiceListOpen] = useState(false);
  // iOS: the system picker does not open over a Modal that is still leaving.
  const startUploadWhenListLeaves = useRef(false);

  const choiceOptions = REPORT_PERIOD_CHOICES.map(value => ({
    value,
    label: t(`reports.period.choices.${value}`),
  }));

  const dateLabel = (date: string | null) =>
    date === null
      ? t('reports.period.selectDate')
      : formatShortCalendarDate(date, locale);

  const generate = (kind: ReportKind) => {
    if (range.from !== null && range.to !== null) {
      onGenerateReport?.(kind, { from: range.from, to: range.to });
    }
  };

  const addFromList = () => {
    setIsInvoiceListOpen(false);

    if (Platform.OS === 'ios') {
      startUploadWhenListLeaves.current = true;
    } else {
      invoiceUpload.start();
    }
  };

  const onListDismissed = () => {
    if (startUploadWhenListLeaves.current) {
      startUploadWhenListLeaves.current = false;
      invoiceUpload.start();
    }
  };

  return (
    <>
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
          <Text accessibilityRole="header" className={SECTION_TITLE}>
            {t('reports.generate.title')}
          </Text>
          <ReportPeriodSelector
            options={choiceOptions}
            value={choice}
            onValueChange={selectChoice}
            startDateLabel={t('reports.period.startDate')}
            startDateValue={dateLabel(range.from)}
            endDateLabel={t('reports.period.endDate')}
            endDateValue={dateLabel(range.to)}
            onDateFieldPress={() => selectChoice('custom')}
            isCustom={choice === 'custom'}
            range={range}
            onRangeChange={setRange}
            maxDate={maxDate}
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
              disabled={!canGenerate || !onGenerateReport}
              onPress={() => generate(kind)}
            />
          ))}
        </View>

        <View className="gap-3">
          <ReportsHistoryLink
            title={t('reports.history.title')}
            actionLabel={t('reports.history.viewAll')}
            onPress={onOpenHistory}
          />
          {history.length === 0 ? (
            <Text className="text-sm text-label-tertiary">
              {t('reports.history.empty')}
            </Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="-mx-4"
              contentContainerClassName="gap-3 px-4 pb-3"
            >
              {history.map(report => (
                <ReportCard
                  key={report.id}
                  date={formatDayAndMonth(new Date(report.generatedAt), locale)}
                  fileName={report.fileName}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <InvoicesSection onSeeAll={() => setIsInvoiceListOpen(true)} />

        <View className="gap-3">
          <Button
            shape="pill"
            icon={Plus}
            className="h-[49px] w-full"
            onPress={invoiceUpload.start}
          >
            <Text>{t('reports.addInvoice')}</Text>
          </Button>
          <ServiceInvoiceUploadFlow upload={invoiceUpload} />
        </View>
      </ScrollView>

      <InvoicesScreen
        visible={isInvoiceListOpen}
        onClose={() => setIsInvoiceListOpen(false)}
        onAddInvoice={addFromList}
        onDismiss={onListDismissed}
      />
    </>
  );
}
