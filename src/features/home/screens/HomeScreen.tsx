import { StyleSheet, View } from 'react-native';

import { useTranslation } from 'shared/i18n';

import { AppTitle } from '../components/AppTitle';
import { GreetingCard } from '../components/GreetingCard';
import { useHomeScreen } from '../hooks/useHomeScreen';

export function HomeScreen() {
  const { t } = useTranslation();
  const { greetingPeriod, userName, isLoading } = useHomeScreen();

  return (
    <View style={styles.container}>
      <AppTitle title={t('home.title')} subtitle={t('home.subtitle')} />
      <GreetingCard
        isLoading={isLoading}
        greeting={t(`home.greeting.${greetingPeriod}`, {
          name: userName ?? '',
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
