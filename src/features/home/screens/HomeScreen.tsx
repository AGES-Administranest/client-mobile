import { LogOut, UserRound } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { OptionsModal } from 'app/components/ui/options-modal';
import { useAuth } from 'features/auth';
import { useTranslation } from 'shared/i18n';

export function HomeScreen() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const [accountVisible, setAccountVisible] = useState(false);

  return (
    <View className="flex-1 items-center justify-center">
      <Pressable
        onPress={() => setAccountVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={t('auth.account.menu')}
        hitSlop={8}
        className="absolute right-4 top-3 h-11 w-11 items-center justify-center rounded-full bg-details-primary active:opacity-70"
      >
        <Icon as={UserRound} className="size-5 text-label-quartenery" />
      </Pressable>
      <Text className="text-2xl font-semibold">{t('tabbar.day')}</Text>
      <OptionsModal
        visible={accountVisible}
        onClose={() => setAccountVisible(false)}
        options={[
          {
            labelKey: 'auth.account.signOut',
            icon: LogOut,
            variant: 'outline',
            onPress: () => {
              setAccountVisible(false);
              signOut();
            },
          },
        ]}
      />
    </View>
  );
}
