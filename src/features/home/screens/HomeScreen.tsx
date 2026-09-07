import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { AppTitle } from '../components/AppTitle';
import { GreetingCard } from '../components/GreetingCard';
import { useHomeScreen } from '../hooks/useHomeScreen';

export function HomeScreen() {
  const { t } = useTranslation();
  const { greetingPeriod, userName, isLoading } = useHomeScreen();

  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background-modal px-4">
      <AppTitle title={t('home.title')} subtitle={t('home.subtitle')} />
      <GreetingCard
        isLoading={isLoading}
        greeting={t(`home.greeting.${greetingPeriod}`, {
          name: userName ?? '',
        })}
      />
      <Button shape="pill" className="mt-4">
        <Text>{t('home.cta')}</Text>
      </Button>
    </View>
  );
}
