import { useState } from 'react';
import {
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { CalculatorScreen } from 'features/calculator';
import { useTranslation } from 'shared/i18n';

import { EntryDetailFlow } from './EntryDetailFlow';
import { NewEntryFlow } from './NewEntryFlow';
import { FinanceHeader } from '../components/FinanceHeader';
import { FinanceOverviewPanel } from '../components/FinanceOverviewPanel';
import { NewEntryButton } from '../components/NewEntryButton';
import { ScopeFilter } from '../components/ScopeFilter';
import { StatementList, type StatementItem } from '../components/StatementList';
import { defaultCategoryKey } from '../domain/financialCategory';
import type { FinancialEntry } from '../domain/financialEntry';
import {
  STATEMENT_SCOPES,
  currentPeriod,
  formatSignedAmount,
  formatStatementDate,
  isAutomaticEntry,
  type StatementScope,
} from '../domain/statement';
import { useFinanceOverview } from '../hooks/useFinanceOverview';
import { useFinancialStatement } from '../hooks/useFinancialStatement';

const SCOPE_KEYS = {
  all: 'all',
  PROFESSIONAL: 'professional',
  PERSONAL: 'personal',
} as const;

const LOAD_MORE_THRESHOLD_PX = 200;

export function FinanceScreen() {
  const { t, locale } = useTranslation();
  const [calculatorVisible, setCalculatorVisible] = useState(false);
  const [scope, setScope] = useState<StatementScope>('all');
  const [period, setPeriod] = useState(() => currentPeriod(new Date()));
  const statement = useFinancialStatement({ period, scope });
  const overview = useFinanceOverview(period);
  const [openEntry, setOpenEntry] = useState<FinancialEntry | null>(null);

  const categoryLabel = (category: FinancialEntry['category']) => {
    const key = defaultCategoryKey(category);
    return key ? t(`financialEntries.categories.${key}`) : category.name;
  };

  const items: StatementItem[] = statement.entries.map(entry => {
    const date = formatStatementDate(entry.accrualDate, locale);
    const category = categoryLabel(entry.category);
    const amount = formatSignedAmount(entry, locale);
    const isAutomatic = isAutomaticEntry(entry);
    const label = t('financialEntries.statement.rowLabel', {
      nature: t(
        entry.nature === 'INCOME'
          ? 'financialEntries.form.nature.income'
          : 'financialEntries.form.nature.expense',
      ),
      description: entry.description,
      amount,
      date,
      category,
    });

    return {
      id: entry.id,
      nature: entry.nature,
      description: entry.description,
      date,
      category,
      amount,
      isAutomatic,
      accessibilityLabel: isAutomatic
        ? `${label}, ${t('financialEntries.statement.automatic')}`
        : label,
    };
  });

  const scopeOptions = STATEMENT_SCOPES.map(value => ({
    value,
    label: t(`financialEntries.statement.scopes.${SCOPE_KEYS[value]}`),
  }));

  const noResultsMessage =
    scope === 'all'
      ? null
      : t(`financialEntries.statement.noResults.${SCOPE_KEYS[scope]}`);
  const today = currentPeriod(new Date());
  const isCurrentMonth =
    period.month === today.month && period.year === today.year;
  const shiftMonth = (offset: number) => {
    const date = new Date(period.year, period.month - 1 + offset, 1);
    setPeriod({ month: date.getMonth() + 1, year: date.getFullYear() });
  };

  const loadMoreNearStatementEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    if (
      contentOffset.y + layoutMeasurement.height >=
      contentSize.height - LOAD_MORE_THRESHOLD_PX
    ) {
      statement.loadMore();
    }
  };

  return (
    <View className="flex-1">
      <NewEntryFlow
        showButton={false}
        containerClassName="flex-1 gap-0 px-0 pt-0"
        onEntrySaved={() => {
          statement.reload();
          overview.retry();
        }}
      >
        {({ openOptions }) => (
          <>
            <FinanceHeader
              title={t('finance.title')}
              calculatorLabel={t('finance.openCalculator')}
              vehicleLabel={t('finance.entryOptionsLabel')}
              onVehiclePress={openOptions}
              onCalculatorPress={() => setCalculatorVisible(true)}
            />
            <ScrollView
              className="flex-1"
              onScroll={loadMoreNearStatementEnd}
              scrollEventThrottle={16}
              testID="finance-scroll"
            >
              <View className="gap-4 pb-6 pt-2">
                <FinanceOverviewPanel
                  period={period}
                  overview={overview.overview}
                  isLoading={overview.isLoading}
                  hasError={overview.hasError}
                  isCurrentMonth={isCurrentMonth}
                  onPreviousMonth={() => shiftMonth(-1)}
                  onNextMonth={() => shiftMonth(1)}
                  onRetry={overview.retry}
                />
                <View className="px-5">
                  <NewEntryButton
                    label={t('financialEntries.newEntry')}
                    onPress={openOptions}
                  />
                </View>
                <View className="gap-3 px-5">
                  <ScopeFilter
                    options={scopeOptions}
                    value={scope}
                    onChange={setScope}
                    accessibilityLabel={t(
                      'financialEntries.statement.scopeFilterLabel',
                    )}
                  />
                  <StatementList
                    items={items}
                    status={statement.status}
                    isLoadingMore={statement.isLoadingMore}
                    loadMoreFailed={statement.loadMoreFailed}
                    texts={{
                      loading: t('financialEntries.statement.loading'),
                      loadingMore: t('financialEntries.statement.loadingMore'),
                      automatic: t('financialEntries.statement.automatic'),
                      retry: t('financialEntries.statement.retry'),
                      loadMoreFailure: t(
                        'financialEntries.statement.loadMoreFailure',
                      ),
                      empty: {
                        title: t('financialEntries.statement.empty.title'),
                        description: t(
                          'financialEntries.statement.empty.description',
                        ),
                        action: t('financialEntries.statement.empty.action'),
                      },
                    }}
                    failureMessage={
                      statement.failure ? t(statement.failure) : null
                    }
                    noResultsMessage={noResultsMessage}
                    onRetry={statement.reload}
                    onRetryLoadMore={statement.retryLoadMore}
                    onCreatePress={openOptions}
                    onItemPress={id =>
                      setOpenEntry(
                        statement.entries.find(entry => entry.id === id) ??
                          null,
                      )
                    }
                  />
                </View>
              </View>
            </ScrollView>
          </>
        )}
      </NewEntryFlow>
      <EntryDetailFlow
        entry={openEntry}
        onChanged={() => {
          statement.reload();
          overview.retry();
        }}
        onFinished={() => setOpenEntry(null)}
      />
      <CalculatorScreen
        visible={calculatorVisible}
        onClose={() => setCalculatorVisible(false)}
      />
    </View>
  );
}
