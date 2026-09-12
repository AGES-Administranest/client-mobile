import { ArrowRight, ScanText, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { OptionsModal } from 'app/components/ui/options-modal';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { AppTitle } from '../components/AppTitle';
import { GreetingCard } from '../components/GreetingCard';
import { useHomeScreen } from '../hooks/useHomeScreen';

export function HomeScreen() {
  const { t } = useTranslation();
  const { greetingPeriod, userName, isLoading } = useHomeScreen();
  const [optionsVisible, setOptionsVisible] = useState(false);

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background-modal px-4">
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
    </View>
  );
}
