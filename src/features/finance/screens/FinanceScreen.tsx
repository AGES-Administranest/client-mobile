import { useState } from 'react';
import { View } from 'react-native';

import { CalculatorScreen } from 'features/calculator';
import { MovementHistoryScreen } from 'features/stock';
import { useTranslation } from 'shared/i18n';

import { NewEntryFlow } from './NewEntryFlow';
import { FinanceHeader } from '../components/FinanceHeader';

export function FinanceScreen() {
  const { t } = useTranslation();
  const [calculatorVisible, setCalculatorVisible] = useState(false);

  return (
    <View className="flex-1 bg-background-modal">
      <FinanceHeader
        title={t('finance.title')}
        calculatorLabel={t('finance.openCalculator')}
        onCalculatorPress={() => setCalculatorVisible(true)}
      />
      <NewEntryFlow />
      <MovementHistoryScreen />
      <CalculatorScreen
        visible={calculatorVisible}
        onClose={() => setCalculatorVisible(false)}
      />
    </View>
  );
}
