import { View } from 'react-native';

import { MovementHistoryScreen } from 'features/stock';

import { NewEntryFlow } from './NewEntryFlow';

export function FinanceScreen() {
  return (
    <View className="flex-1 bg-background-modal">
      <NewEntryFlow />
      <MovementHistoryScreen />
    </View>
  );
}
