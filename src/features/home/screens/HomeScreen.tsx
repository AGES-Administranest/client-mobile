import { ArrowRight } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { MaterialCard } from 'app/components/ui/card';
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
      <MaterialCard
        name="Propofol 10mg/ml 20ml"
        category="Medicamento"
        price={19.9}
        unit="ampola"
        quantity={8}
        minQuantity={10}
        className="w-full"
      />
      <Button
        shape="pill"
        icon={ArrowRight}
        className="mt-4 h-[49px] w-[353px]"
      >
        <Text>{t('home.cta')}</Text>
      </Button>
    </View>
  );
}
