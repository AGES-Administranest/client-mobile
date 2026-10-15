import { useState } from 'react';
import {
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { CalculatorScreen } from 'features/calculator';
import { MovementHistoryScreen } from 'features/stock';
import { useTranslation } from 'shared/i18n';

import { NewEntryFlow } from './NewEntryFlow';
import { FinanceHeader } from '../components/FinanceHeader';
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
  // O seletor de mês é da US04: até ele chegar, o extrato mostra o mês atual.
  const [period] = useState(() => currentPeriod(new Date()));
  const statement = useFinancialStatement({ period, scope });
  const [stockHistoryHeight, setStockHistoryHeight] = useState(0);

  const categoryLabel = (category: FinancialEntry['category']) => {
    const key = defaultCategoryKey(category);
    return key ? t(`financialEntries.categories.${key}`) : category.name;
  };

  const items: StatementItem[] = statement.entries.map(entry => ({
    id: entry.id,
    nature: entry.nature,
    description: entry.description,
    date: formatStatementDate(entry.accrualDate, locale),
    category: categoryLabel(entry.category),
    amount: formatSignedAmount(entry, locale),
    isAutomatic: isAutomaticEntry(entry),
  }));

  const scopeOptions = STATEMENT_SCOPES.map(value => ({
    value,
    label: t(`financialEntries.statement.scopes.${SCOPE_KEYS[value]}`),
  }));

  const noResultsMessage =
    scope === 'all'
      ? null
      : t(`financialEntries.statement.noResults.${SCOPE_KEYS[scope]}`);

  const loadMoreNearStatementEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const statementEnd = contentSize.height - stockHistoryHeight;
    if (
      contentOffset.y + layoutMeasurement.height >=
      statementEnd - LOAD_MORE_THRESHOLD_PX
    ) {
      statement.loadMore();
    }
  };

  return (
    <View className="flex-1 bg-background-modal">
      <FinanceHeader
        title={t('finance.title')}
        calculatorLabel={t('finance.openCalculator')}
        onCalculatorPress={() => setCalculatorVisible(true)}
      />
      <ScrollView
        onScroll={loadMoreNearStatementEnd}
        scrollEventThrottle={16}
        testID="finance-scroll"
      >
        <NewEntryFlow onEntrySaved={statement.reload}>
          {({ openOptions }) => (
            <View className="gap-3 pb-6 pt-2">
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
                texts={{
                  loading: t('financialEntries.statement.loading'),
                  loadingMore: t('financialEntries.statement.loadingMore'),
                  automatic: t('financialEntries.statement.automatic'),
                  retry: t('financialEntries.statement.retry'),
                  empty: {
                    title: t('financialEntries.statement.empty.title'),
                    description: t(
                      'financialEntries.statement.empty.description',
                    ),
                    action: t('financialEntries.statement.empty.action'),
                  },
                }}
                failureMessage={statement.failure ? t(statement.failure) : null}
                noResultsMessage={noResultsMessage}
                onRetry={statement.reload}
                onCreatePress={openOptions}
              />
            </View>
          )}
        </NewEntryFlow>
        <View
          onLayout={event =>
            setStockHistoryHeight(event.nativeEvent.layout.height)
          }
        >
          <MovementHistoryScreen />
        </View>
      </ScrollView>
      <CalculatorScreen
        visible={calculatorVisible}
        onClose={() => setCalculatorVisible(false)}
      />
    </View>
  );
}
