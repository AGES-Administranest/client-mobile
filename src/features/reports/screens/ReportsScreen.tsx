import { FileText, Plus, Receipt } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { InvoicesScreen, InvoicesSection } from 'features/invoices';
import { isMissingCrmv, useProfile } from 'features/profile';
import {
  ServiceInvoiceUploadFlow,
  ServiceInvoicesFlow,
  useServiceInvoiceUpload,
} from 'features/serviceInvoices';
import { type TranslationKey, useTranslation } from 'shared/i18n';
import { formatShortCalendarDate } from 'shared/utils/calendar';
import { formatDayAndMonth } from 'shared/utils/formatDayAndMonth';

import { ReportHistoryScreen } from './ReportHistoryScreen';
import { ReportCard } from '../components/ReportCard';
import { ReportCategoriesSheet } from '../components/ReportCategoriesSheet';
import { ReportKindCard } from '../components/ReportKindCard';
import { ReportPeriodSelector } from '../components/ReportPeriodSelector';
import { ReportsHeader } from '../components/ReportsHeader';
import { ReportsHistoryLink } from '../components/ReportsHistoryLink';
import {
  MAX_REPORT_DAYS,
  REPORT_CATEGORIES,
  type ReportCategory,
  type ReportHistoryItem,
} from '../domain/report.types';
import { REPORT_PERIOD_CHOICES } from '../domain/reportPeriod';
import {
  useReportHistory,
  type GenerateFailure,
} from '../hooks/useReportHistory';
import { useReportsScreen } from '../hooks/useReportsScreen';

const HISTORY_PREVIEW_COUNT = 5;

const GENERATE_FAILURE_MESSAGES: Record<GenerateFailure, TranslationKey> = {
  offline: 'reports.generate.offline',
  periodTooLong: 'reports.generate.periodTooLong',
  downloadFailed: 'reports.generate.downloadFailed',
  failed: 'reports.generate.failed',
};

const SECTION_TITLE =
  'text-sm font-semibold uppercase tracking-wide text-label-primary';

export type ReportsScreenProps = {
  onGenerateInvoicePackage?: (period: { from: string; to: string }) => void;
};

export function ReportsScreen({
  onGenerateInvoicePackage,
}: ReportsScreenProps) {
  const { t, locale } = useTranslation();
  const reports = useReportHistory();
  const invoiceUpload = useServiceInvoiceUpload();
  const { choice, selectChoice, range, setRange, maxDate, canGenerate } =
    useReportsScreen();
  const { state: profile, reload: reloadProfile } = useProfile();
  const isCrmvMissing =
    profile.status === 'ready' && isMissingCrmv(profile.profile);

  const [categories, setCategories] = useState<ReportCategory[]>([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [generateFailure, setGenerateFailure] =
    useState<GenerateFailure | null>(null);
  const [shareFailed, setShareFailed] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isInvoiceListOpen, setIsInvoiceListOpen] = useState(false);
  const [isServiceInvoicesOpen, setIsServiceInvoicesOpen] = useState(false);
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

  const openCategories = () => {
    // The CRMV may have been filled in the Profile tab meanwhile.
    reloadProfile();
    setCategories(reports.lastSelection);
    setGenerateFailure(null);
    setIsCategoryOpen(true);
  };

  const generateInvoicePackage = () => {
    if (range.from !== null && range.to !== null) {
      onGenerateInvoicePackage?.({ from: range.from, to: range.to });
    }
  };

  const generateGeneralReport = () => {
    if (range.from === null || range.to === null) {
      return;
    }

    setGenerateFailure(null);
    reports
      .generate({ categories, from: range.from, to: range.to })
      .then(result => {
        if (result.ok) {
          setIsCategoryOpen(false);
        } else {
          setGenerateFailure(result.reason);
        }
      });
  };

  // The failure was about the sections chosen before; it no longer applies.
  const changeCategories = (
    update: (current: ReportCategory[]) => ReportCategory[],
  ) => {
    setCategories(update);
    setGenerateFailure(null);
  };

  const shareReport = (report: ReportHistoryItem) => {
    setShareFailed(false);
    reports.share(report).then(ok => setShareFailed(!ok));
  };

  // A report listed by the server or generated on the web has no file on this
  // device to share, so its card is not a button.
  const shareActionOf = (report: ReportHistoryItem) =>
    report.fileUri ? () => shareReport(report) : undefined;

  const toggleHistory = (open: boolean) => {
    setShareFailed(false);
    setIsHistoryOpen(open);
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
      <ReportsHeader
        title={t('tabbar.reports')}
        invoicesLabel={t('reports.openInvoices')}
        onInvoicesPress={() => setIsServiceInvoicesOpen(true)}
      />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-6 px-4 pb-6 pt-2"
        keyboardShouldPersistTaps="handled"
      >
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
            maxRangeDays={MAX_REPORT_DAYS}
            locale={locale}
            previousMonthLabel={t('reports.period.previousMonth')}
            nextMonthLabel={t('reports.period.nextMonth')}
            previousYearLabel={t('reports.period.previousYear')}
            nextYearLabel={t('reports.period.nextYear')}
          />
          <ReportKindCard
            icon={FileText}
            title={t('reports.kinds.general.title')}
            description={t('reports.kinds.general.description')}
            disabled={!canGenerate}
            onPress={openCategories}
          />
          <ReportKindCard
            icon={Receipt}
            title={t('reports.kinds.invoicePackage.title')}
            description={t('reports.kinds.invoicePackage.description')}
            disabled={!canGenerate || !onGenerateInvoicePackage}
            onPress={generateInvoicePackage}
          />
        </View>

        <View className="gap-3">
          <ReportsHistoryLink
            title={t('reports.history.title')}
            actionLabel={t('reports.history.viewAll')}
            onPress={
              reports.items.length > 0 ? () => toggleHistory(true) : undefined
            }
          />
          {reports.items.length === 0 ? (
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
              {reports.items.slice(0, HISTORY_PREVIEW_COUNT).map(report => (
                <ReportCard
                  key={report.id}
                  date={formatDayAndMonth(
                    new Date(report.generatedAt),
                    locale,
                    true,
                  )}
                  fileName={report.fileName}
                  onPress={shareActionOf(report)}
                />
              ))}
            </ScrollView>
          )}
          {shareFailed ? (
            <Text className="text-sm text-label-tertiary">
              {t('reports.history.shareFailed')}
            </Text>
          ) : null}
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
          {isServiceInvoicesOpen ? null : (
            <ServiceInvoiceUploadFlow upload={invoiceUpload} />
          )}
        </View>
      </ScrollView>

      <ReportCategoriesSheet
        visible={isCategoryOpen}
        title={t('reports.generate.categoriesTitle')}
        closeLabel={t('reports.generate.close')}
        selectAllLabel={t('reports.generate.selectAll')}
        clearAllLabel={t('reports.generate.clearAll')}
        generateLabel={t(
          generateFailure === 'downloadFailed'
            ? 'reports.generate.retryDownload'
            : 'reports.generate.confirm',
        )}
        options={REPORT_CATEGORIES.map(item => ({
          id: item,
          label: t(`reports.categories.${item}`),
        }))}
        selectedIds={categories}
        isGenerating={reports.isGenerating}
        warning={isCrmvMissing ? t('reports.generate.crmvMissing') : null}
        error={
          generateFailure ? t(GENERATE_FAILURE_MESSAGES[generateFailure]) : null
        }
        onToggle={id =>
          changeCategories(current =>
            current.includes(id as ReportCategory)
              ? current.filter(item => item !== id)
              : [...current, id as ReportCategory],
          )
        }
        onSelectAll={() => changeCategories(() => [...REPORT_CATEGORIES])}
        onClearAll={() => changeCategories(() => [])}
        onGenerate={generateGeneralReport}
        onClose={() => setIsCategoryOpen(false)}
      />

      <ReportHistoryScreen
        visible={isHistoryOpen}
        items={reports.items}
        shareError={shareFailed ? t('reports.history.shareFailed') : null}
        onClose={() => toggleHistory(false)}
        shareActionOf={shareActionOf}
      />

      <ServiceInvoicesFlow
        open={isServiceInvoicesOpen}
        onClose={() => setIsServiceInvoicesOpen(false)}
        upload={invoiceUpload}
      />

      <InvoicesScreen
        visible={isInvoiceListOpen}
        onClose={() => setIsInvoiceListOpen(false)}
        onAddInvoice={addFromList}
        onDismiss={onListDismissed}
      />
    </>
  );
}
