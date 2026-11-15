import { FileText, Plus, Receipt } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { NoticeBanner } from 'app/components/ui/notice-banner';
import { Text } from 'app/components/ui/text';
import { InvoicesScreen, InvoicesSection } from 'features/invoices';
import { isMissingCrmv, useProfile } from 'features/profile';
import {
  ServiceInvoiceUploadFlow,
  ServiceInvoicesFlow,
  useServiceInvoiceUpload,
} from 'features/serviceInvoices';
import { type TranslationKey, useTranslation } from 'shared/i18n';
import { onConnectionRestored } from 'shared/services/network';
import { formatShortCalendarDate } from 'shared/utils/calendar';

import { ReportHistoryScreen } from './ReportHistoryScreen';
import { ReportHistorySection } from './ReportHistorySection';
import { ReportCategoriesSheet } from '../components/ReportCategoriesSheet';
import { ReportKindCard } from '../components/ReportKindCard';
import { ReportPeriodSelector } from '../components/ReportPeriodSelector';
import { ReportsHeader } from '../components/ReportsHeader';
import {
  MAX_REPORT_DAYS,
  REPORT_CATEGORIES,
  type ReportCategory,
} from '../domain/report.types';
import { REPORT_PERIOD_CHOICES } from '../domain/reportPeriod';
import {
  useGenerateReport,
  type GenerateFailure,
} from '../hooks/useGenerateReport';
import type { ReportAvailabilityNotice } from '../hooks/useReportAvailability';
import { useReportHistory } from '../hooks/useReportHistory';
import { useReportsScreen } from '../hooks/useReportsScreen';

const GENERATE_FAILURE_MESSAGES: Record<GenerateFailure, TranslationKey> = {
  offline: 'reports.generate.offline',
  periodTooLong: 'reports.generate.periodTooLong',
  downloadFailed: 'reports.generate.downloadFailed',
  failed: 'reports.generate.failed',
};

const NOTICE_TONES = {
  offline: 'warning',
  empty: 'warning',
  failed: 'alert',
} as const satisfies Record<ReportAvailabilityNotice, string>;

const SECTION_TITLE =
  'text-sm font-semibold uppercase tracking-wide text-label-primary';

export type ReportsScreenProps = {
  onGenerateInvoicePackage?: (period: { from: string; to: string }) => void;
};

export function ReportsScreen({
  onGenerateInvoicePackage,
}: ReportsScreenProps) {
  const { t, locale } = useTranslation();
  const history = useReportHistory();
  const reports = useGenerateReport({ onGenerated: history.add });
  const invoiceUpload = useServiceInvoiceUpload();
  const {
    choice,
    selectChoice,
    range,
    setRange,
    maxDate,
    periodError,
    notice,
    canGenerate,
    checkPeriod,
  } = useReportsScreen();
  const { state: profile, reload: reloadProfile } = useProfile();
  const isCrmvMissing =
    profile.status === 'ready' && isMissingCrmv(profile.profile);

  const [categories, setCategories] = useState<ReportCategory[]>([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [generateFailure, setGenerateFailure] =
    useState<GenerateFailure | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isInvoiceListOpen, setIsInvoiceListOpen] = useState(false);
  const [isServiceInvoicesOpen, setIsServiceInvoicesOpen] = useState(false);
  // iOS: the system picker does not open over a Modal that is still leaving.
  const startUploadWhenListLeaves = useRef(false);

  const { retry: retryHistory } = history;
  useEffect(() => onConnectionRestored(retryHistory), [retryHistory]);

  const choiceOptions = REPORT_PERIOD_CHOICES.map(value => ({
    value,
    label: t(`reports.period.choices.${value}`),
  }));

  const dateLabel = (date: string | null) =>
    date === null
      ? t('reports.period.selectDate')
      : formatShortCalendarDate(date, locale);

  const openCategories = async () => {
    if (!(await checkPeriod())) {
      return;
    }

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
          {periodError === 'END_BEFORE_START' ? (
            <Text
              accessibilityLiveRegion="polite"
              className="text-xs text-alert-primary"
            >
              {t('reports.period.errors.endBeforeStart')}
            </Text>
          ) : null}
          {notice !== null ? (
            <View role="alert" accessibilityLiveRegion="polite">
              <NoticeBanner
                tone={NOTICE_TONES[notice]}
                message={t(`reports.availability.${notice}`)}
              />
            </View>
          ) : null}
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

        <ReportHistorySection
          history={history}
          onSeeAll={() => setIsHistoryOpen(true)}
        />

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
        history={history}
        onClose={() => setIsHistoryOpen(false)}
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
