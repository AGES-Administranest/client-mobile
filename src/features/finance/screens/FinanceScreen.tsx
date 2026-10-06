import { ChevronRight, PiggyBank } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { FixedCostsScreen } from 'features/fixedCosts';
import { MovementHistoryScreen } from 'features/stock';
import { useTranslation } from 'shared/i18n';

export function FinanceScreen() {
  const { t } = useTranslation();
  const [fixedCostsVisible, setFixedCostsVisible] = useState(false);

  return (
    <View className="flex-1 bg-background-modal">
      <Pressable
        onPress={() => setFixedCostsVisible(true)}
        accessibilityRole="button"
        className="mx-4 mt-3 flex-row items-center gap-3 rounded-2xl bg-white p-4 shadow-md shadow-black/10 active:opacity-80"
      >
        <View className="size-10 items-center justify-center rounded-full bg-details-primary">
          <Icon as={PiggyBank} size={18} className="text-label-quartenery" />
        </View>
        <Text className="flex-1 text-[15px] font-semibold text-label-primary">
          {t('finance.fixedCostsEntry')}
        </Text>
        <Icon as={ChevronRight} size={18} className="text-label-tertiary" />
      </Pressable>

      <MovementHistoryScreen />

      <FixedCostsScreen
        visible={fixedCostsVisible}
        onClose={() => setFixedCostsVisible(false)}
      />
    </View>
  );
}
