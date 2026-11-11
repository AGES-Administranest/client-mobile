import { CalendarDays, FilePlus, Plus } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { DateRangePicker } from 'app/components/ui/date-range-picker';
import { Text } from 'app/components/ui/text';
import { InvoicesScreen, InvoicesSection } from 'features/invoices';
import {
  ServiceInvoiceUploadFlow,
  useServiceInvoiceUpload,
} from 'features/serviceInvoices';
import { useTranslation } from 'shared/i18n';
import {
  EMPTY_CALENDAR_RANGE,
  fromCalendarDate,
  isRangeComplete,
  toCalendarDate,
  type CalendarRange,
} from 'shared/utils/calendar';
import { formatDayAndMonth } from 'shared/utils/formatDayAndMonth';

import { ReportHistoryScreen } from './ReportHistoryScreen';
import { ReportCard } from '../components/ReportCard';
import { ReportCategoriesSheet } from '../components/ReportCategoriesSheet';
import { ReportField } from '../components/ReportField';
import {
  REPORT_CATEGORIES,
  type ReportCategory,
  type ReportHistoryItem,
} from '../domain/report.types';
import { useReportHistory } from '../hooks/useReportHistory';

const HISTORY_PREVIEW_COUNT = 5;

const SECTION_TITLE =
  'text-sm font-semibold uppercase tracking-wide text-label-primary';

export function ReportsScreen() {
  const { t, locale } = useTranslation();
  const reports = useReportHistory();
  const invoiceUpload = useServiceInvoiceUpload();

  const [categories, setCategories] = useState<ReportCategory[]>([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [range, setRange] = useState<CalendarRange>(EMPTY_CALENDAR_RANGE);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isInvoiceListOpen, setIsInvoiceListOpen] = useState(false);
  // iOS: the system picker does not open over a Modal that is still leaving.
  const startUploadWhenListLeaves = useRef(false);

  const shareReport = (report: ReportHistoryItem) => {
    setShareFailed(false);
    reports.share(report).then(ok => setShareFailed(!ok));
  };

  const dateLabel = (calendarDate: string | null) =>
    calendarDate
      ? formatDayAndMonth(fromCalendarDate(calendarDate), locale, true)
      : t('reports.generate.selectDate');

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
        contentContainerClassName="gap-6 px-4 pb-6 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        <Text accessibilityRole="header" className="text-[40px] font-medium">
          {t('tabbar.reports')}
        </Text>

        <View className="gap-3">
          <Text className={SECTION_TITLE}>{t('reports.generate.title')}</Text>
          <View className="flex-row gap-4">
            <View className="flex-1 gap-2">
              <Text className="text-sm font-medium text-label-primary">
                {t('reports.generate.startDate')}
              </Text>
              <ReportField
                value={dateLabel(range.from)}
                isPlaceholder={range.from === null}
                leadingIcon={CalendarDays}
                accessibilityLabel={t('reports.generate.startDate')}
                onPress={() => setIsCalendarOpen(open => !open)}
              />
            </View>
            <View className="flex-1 gap-2">
              <Text className="text-sm font-medium text-label-primary">
                {t('reports.generate.endDate')}
              </Text>
              <ReportField
                value={dateLabel(range.to)}
                isPlaceholder={range.to === null}
                leadingIcon={CalendarDays}
                accessibilityLabel={t('reports.generate.endDate')}
                onPress={() => setIsCalendarOpen(open => !open)}
              />
            </View>
          </View>
          {isCalendarOpen ? (
            <DateRangePicker
              value={range}
              onChange={next => {
                setRange(next);

                if (isRangeComplete(next)) {
                  setIsCalendarOpen(false);
                }
              }}
              locale={locale}
              maxDate={toCalendarDate(new Date())}
              previousMonthLabel={t('reports.generate.previousMonth')}
              nextMonthLabel={t('reports.generate.nextMonth')}
              previousYearLabel={t('reports.generate.previousYear')}
              nextYearLabel={t('reports.generate.nextYear')}
            />
          ) : null}
          <Button
            shape="pill"
            icon={FilePlus}
            className="h-[49px] w-full"
            disabled={!isRangeComplete(range)}
            onPress={() => {
              setCategories([]);
              setIsCategoryOpen(true);
            }}
          >
            <Text>{t('reports.generate.button')}</Text>
          </Button>
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className={SECTION_TITLE}>{t('reports.history.title')}</Text>
            {reports.items.length > 0 ? (
              <Text
                accessibilityRole="button"
                onPress={() => setIsHistoryOpen(true)}
                className="text-xs text-label-quartenery"
              >
                {t('reports.seeAll')}
              </Text>
            ) : null}
          </View>
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
                  onPress={() => shareReport(report)}
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
          <ServiceInvoiceUploadFlow upload={invoiceUpload} />
        </View>
      </ScrollView>

      <ReportCategoriesSheet
        visible={isCategoryOpen}
        title={t('reports.generate.categoriesTitle')}
        closeLabel={t('reports.generate.close')}
        selectAllLabel={t('reports.generate.selectAll')}
        clearAllLabel={t('reports.generate.clearAll')}
        generateLabel={t('reports.generate.confirm')}
        options={REPORT_CATEGORIES.map(item => ({
          id: item,
          label: t(`reports.categories.${item}`),
        }))}
        selectedIds={categories}
        isGenerating={reports.isGenerating}
        onToggle={id =>
          setCategories(current =>
            current.includes(id as ReportCategory)
              ? current.filter(item => item !== id)
              : [...current, id as ReportCategory],
          )
        }
        onSelectAll={() => setCategories([...REPORT_CATEGORIES])}
        onClearAll={() => setCategories([])}
        onGenerate={() => {
          if (range.from && range.to) {
            reports
              .generate({ categories, from: range.from, to: range.to })
              .then(ok => ok && setIsCategoryOpen(false));
          }
        }}
        onClose={() => setIsCategoryOpen(false)}
      />

      <ReportHistoryScreen
        visible={isHistoryOpen}
        items={reports.items}
        onClose={() => setIsHistoryOpen(false)}
        onSelect={shareReport}
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
