import { useState } from 'react';
import { View } from 'react-native';

import { CalculatorScreen } from 'features/calculator';
import { MovementHistoryScreen } from 'features/stock';
import { VehiclesScreen } from 'features/vehicles';
import { useTranslation } from 'shared/i18n';

import { FinanceHeader } from '../components/FinanceHeader';

export function FinanceScreen() {
  const { t } = useTranslation();
  const [calculatorVisible, setCalculatorVisible] = useState(false);
  const [vehiclesVisible, setVehiclesVisible] = useState(false);

  return (
    <View className="flex-1 bg-background-modal">
      <FinanceHeader
        title={t('finance.title')}
        calculatorLabel={t('finance.openCalculator')}
        onCalculatorPress={() => setCalculatorVisible(true)}
        vehiclesLabel={t('vehicles.openVehicles')}
        onVehiclesPress={() => setVehiclesVisible(true)}
      />
      <MovementHistoryScreen />
      <CalculatorScreen
        visible={calculatorVisible}
        onClose={() => setCalculatorVisible(false)}
      />
      <VehiclesScreen
        visible={vehiclesVisible}
        onClose={() => setVehiclesVisible(false)}
      />
    </View>
  );
}
