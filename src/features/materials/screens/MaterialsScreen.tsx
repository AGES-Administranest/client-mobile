import { View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { StockEntryFlow } from 'features/stockEntry';
import { useTranslation } from 'shared/i18n';

export function MaterialsScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 bg-background-modal">
      <Text variant="h3" className="px-5 pt-4 text-center">
        {t('tabbar.materials')}
      </Text>
      <StockEntryFlow />
    </View>
  );
}
