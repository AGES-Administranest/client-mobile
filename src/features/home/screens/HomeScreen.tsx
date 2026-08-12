import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from 'shared/i18n';

export function HomeScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('home.title')}</Text>
      <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  subtitle: {
    color: '#666666',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 9,
  },
});
