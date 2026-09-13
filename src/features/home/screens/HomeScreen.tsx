import {
  ArrowRight,
  LogOut,
  Plus,
  ScanText,
  UserRound,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { OptionsModal } from 'app/components/ui/options-modal';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { AppTitle } from '../components/AppTitle';
import { GreetingCard } from '../components/GreetingCard';
import { useHomeScreen } from '../hooks/useHomeScreen';

export function HomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { greetingPeriod, userName, isLoading, signOut } = useHomeScreen();
  const [optionsVisible, setOptionsVisible] = useState(false);
  // Sign out lives here until the Profile tab exists (US34 puts it there).
  const [accountVisible, setAccountVisible] = useState(false);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background-modal px-4">
      <Pressable
        onPress={() => setAccountVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={t('auth.account.menu')}
        hitSlop={8}
        className="absolute right-4 h-11 w-11 items-center justify-center rounded-full bg-details-primary active:opacity-70"
        style={{ top: insets.top + 12 }}
      >
        <Icon as={UserRound} className="size-5 text-label-quartenery" />
      </Pressable>
      <AppTitle title={t('home.title')} subtitle={t('home.subtitle')} />
      <GreetingCard
        isLoading={isLoading}
        greeting={t(`home.greeting.${greetingPeriod}`, {
          name: userName ?? '',
        })}
      />
      <Button
        shape="pill"
        icon={ArrowRight}
        className="mt-4 h-[49px] w-[353px]"
        onPress={() => setOptionsVisible(true)}
      >
        <Text>{t('home.cta')}</Text>
      </Button>
      <OptionsModal
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        options={[
          {
            labelKey: 'optionsModal.scanNote',
            icon: ScanText,
            onPress: () => setOptionsVisible(false),
          },
          {
            labelKey: 'optionsModal.typeSupply',
            icon: Plus,
            onPress: () => setOptionsVisible(false),
          },
        ]}
      />
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
