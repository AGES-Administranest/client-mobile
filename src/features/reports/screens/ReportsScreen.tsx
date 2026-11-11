import {
  CalendarDays,
  ChevronDown,
  FilePlus,
  Package,
  Plus,
  Stethoscope,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { DateRangePicker } from 'app/components/ui/date-range-picker';
import { OptionsModal } from 'app/components/ui/options-modal';
import { Text } from 'app/components/ui/text';
import { InvoicesScreen, InvoicesSection } from 'features/invoices';
import {
  ServiceInvoiceUploadFlow,
  ServiceInvoicesFlow,
  useServiceInvoiceUpload,
} from 'features/serviceInvoices';
import { useTranslation } from 'shared/i18n';
import {
  EMPTY_CALENDAR_RANGE,
  fromCalendarDate,
  isRangeComplete,
  type CalendarRange,
} from 'shared/utils/calendar';
import { formatDayAndMonth } from 'shared/utils/formatDayAndMonth';

import { ReportCard } from '../components/ReportCard';
import { ReportField } from '../components/ReportField';
import { ReportsHeader } from '../components/ReportsHeader';
import { REPORT_CATEGORIES, type ReportCategory } from '../domain/report.types';
import { useReportHistory } from '../hooks/useReportHistory';

const CATEGORY_ICONS: Record<ReportCategory, LucideIcon> = {
  financial: Wallet,
  appointments: Stethoscope,
  inventory: Package,
};

const SECTION_TITLE =
  'text-sm font-semibold uppercase tracking-wide text-label-primary';

export function ReportsScreen() {
  const { t, locale } = useTranslation();
  const history = useReportHistory();
  const invoiceUpload = useServiceInvoiceUpload();

  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [range, setRange] = useState<CalendarRange>(EMPTY_CALENDAR_RANGE);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isInvoiceListOpen, setIsInvoiceListOpen] = useState(false);
  const [isServiceInvoicesOpen, setIsServiceInvoicesOpen] = useState(false);
  // iOS: the system picker does not open over a Modal that is still leaving.
  const startUploadWhenListLeaves = useRef(false);

  const dateLabel = (calendarDate: string | null) =>
    calendarDate
      ? formatDayAndMonth(fromCalendarDate(calendarDate), locale)
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
          <Text className={SECTION_TITLE}>{t('reports.generate.title')}</Text>
          <ReportField
            value={
              category
                ? t(`reports.categories.${category}`)
                : t('reports.generate.categoryPlaceholder')
            }
            isPlaceholder={category === null}
            trailingIcon={ChevronDown}
            accessibilityLabel={t('reports.generate.categoryPlaceholder')}
            onPress={() => setIsCategoryOpen(true)}
          />
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
              previousMonthLabel={t('reports.generate.previousMonth')}
              nextMonthLabel={t('reports.generate.nextMonth')}
            />
          ) : null}
          {/* Disabled until the report endpoints exist (see the Sprint 4 tasks). */}
          <Button
            shape="pill"
            icon={FilePlus}
            className="h-[49px] w-full"
            disabled
          >
            <Text>{t('reports.generate.button')}</Text>
          </Button>
        </View>

        <View className="gap-3">
          <Text className={SECTION_TITLE}>{t('reports.history.title')}</Text>
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
          {isServiceInvoicesOpen ? null : (
            <ServiceInvoiceUploadFlow upload={invoiceUpload} />
          )}
        </View>
      </ScrollView>

      <OptionsModal
        visible={isCategoryOpen}
        onClose={() => setIsCategoryOpen(false)}
        title={t('reports.generate.categoryPlaceholder')}
        options={REPORT_CATEGORIES.map(item => ({
          label: t(`reports.categories.${item}`),
          icon: CATEGORY_ICONS[item],
          onPress: () => {
            setCategory(item);
            setIsCategoryOpen(false);
          },
        }))}
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
