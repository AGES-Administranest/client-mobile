import { FilePlus, Plus } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { NoticeBanner, type NoticeTone } from 'app/components/ui/notice-banner';
import { Text } from 'app/components/ui/text';
import { useAuth } from 'features/auth';
import { isMissingCrmv, useProfile } from 'features/profile';
import {
  ServiceInvoiceUploadFlow,
  ServiceInvoicesFlow,
  ServiceInvoicesSection,
  useServiceInvoiceUpload,
} from 'features/serviceInvoices';
import { type TranslationKey, useTranslation } from 'shared/i18n';
import { onConnectionRestored } from 'shared/services/network';
import { formatShortCalendarDate } from 'shared/utils/calendar';

import { ReportHistoryScreen } from './ReportHistoryScreen';
import { ReportHistorySection } from './ReportHistorySection';
import { ReportCategoriesSheet } from '../components/ReportCategoriesSheet';
import { ReportPeriodSelector } from '../components/ReportPeriodSelector';
import { ReportsHeader } from '../components/ReportsHeader';
import {
  MAX_REPORT_DAYS,
  REPORT_CATEGORIES,
  type ReportCategory,
  type ReportHistoryItem,
} from '../domain/report.types';
import { REPORT_PERIOD_CHOICES } from '../domain/reportPeriod';
import {
  useGenerateReport,
  type GenerateFailure,
} from '../hooks/useGenerateReport';
import type { ReportAvailabilityNotice } from '../hooks/useReportAvailability';
import { useReportHistory } from '../hooks/useReportHistory';
import { useReportsScreen } from '../hooks/useReportsScreen';
import { openLocalReport } from '../services/reportFileOpener';
import { findLocalReport } from '../services/reportFileStore';

const GENERATE_FAILURE_MESSAGES: Record<GenerateFailure, TranslationKey> = {
  offline: 'reports.generate.offline',
  periodTooLong: 'reports.generate.periodTooLong',
  downloadFailed: 'reports.generate.downloadFailed',
  failed: 'reports.generate.failed',
};

const NOTICES = {
  offline: { tone: 'warning', message: 'reports.generate.offline' },
  empty: { tone: 'alert', message: 'reports.availability.empty' },
  failed: { tone: 'alert', message: 'reports.generate.failed' },
} as const satisfies Record<
  ReportAvailabilityNotice,
  { tone: NoticeTone; message: TranslationKey }
>;

const SECTION_TITLE =
  'text-sm font-semibold uppercase tracking-wide text-label-primary';

export function ReportsScreen() {
  const { t, locale } = useTranslation();
  const history = useReportHistory();
  const reports = useGenerateReport({ onGenerated: history.add });
  const { account } = useAuth();
  const invoiceUpload = useServiceInvoiceUpload();
  // The report just generated, handed to the share sheet once the sheet that
  // made it is gone (a second Modal cannot be presented while one is leaving).
  const reportToShare = useRef<ReportHistoryItem | null>(null);
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
  const [isServiceInvoicesOpen, setIsServiceInvoicesOpen] = useState(false);
  const [invoiceToOpen, setInvoiceToOpen] = useState<string | null>(null);

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

  const generateGeneralReport = () => {
    if (range.from === null || range.to === null) {
      return;
    }

    setGenerateFailure(null);
    reports
      .generate({ categories, from: range.from, to: range.to })
      .then(result => {
        if (result.ok) {
          reportToShare.current = result.report;
          setIsCategoryOpen(false);
        } else {
          setGenerateFailure(result.reason);
        }
      });
  };

  // On the phone a report is made to be sent somewhere: it is already saved on
  // the device, so the system share sheet opens right away. The web has no
  // local copy and the browser already downloaded it.
  const shareGeneratedReport = () => {
    const report = reportToShare.current;
    reportToShare.current = null;
    const file = report && account ? findLocalReport(account.id, report) : null;
    if (file) openLocalReport(file).catch(() => undefined);
  };

  // The failure was about the sections chosen before; it no longer applies.
  const changeCategories = (
    update: (current: ReportCategory[]) => ReportCategory[],
  ) => {
    setCategories(update);
    setGenerateFailure(null);
  };

  return (
    <>
      <ReportsHeader title={t('tabbar.reports')} />
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
            label={t('reports.period.label')}
            description={t(`reports.period.descriptions.${choice}`)}
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
            <View accessibilityLiveRegion="polite">
              <NoticeBanner
                tone={NOTICES[notice].tone}
                message={t(NOTICES[notice].message)}
              />
            </View>
          ) : null}
          <Button
            shape="pill"
            icon={FilePlus}
            className="h-[49px] w-full"
            accessibilityLabel={t('reports.generate.button')}
            disabled={!canGenerate}
            onPress={openCategories}
          >
            <Text>{t('reports.generate.button')}</Text>
          </Button>
        </View>

        <ReportHistorySection
          history={history}
          onSeeAll={() => setIsHistoryOpen(true)}
        />

        <ServiceInvoicesSection
          onSeeAll={() => {
            setInvoiceToOpen(null);
            setIsServiceInvoicesOpen(true);
          }}
          onOpenInvoice={invoiceId => {
            setInvoiceToOpen(invoiceId);
            setIsServiceInvoicesOpen(true);
          }}
        />

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
        emptySelectionMessage={t('reports.generate.noSection')}
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
        onClosed={shareGeneratedReport}
      />

      <ReportHistoryScreen
        visible={isHistoryOpen}
        history={history}
        onClose={() => setIsHistoryOpen(false)}
      />

      <ServiceInvoicesFlow
        open={isServiceInvoicesOpen}
        initialInvoiceId={invoiceToOpen}
        onClose={() => setIsServiceInvoicesOpen(false)}
        upload={invoiceUpload}
      />
    </>
  );
}
