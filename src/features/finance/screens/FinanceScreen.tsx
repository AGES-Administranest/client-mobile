import { View } from 'react-native';

import { MovementHistoryScreen } from 'features/stock';

export function FinanceScreen() {
  return (
    <View className="flex-1 bg-background-modal">
      <MovementHistoryScreen />
    </View>
  );
}
