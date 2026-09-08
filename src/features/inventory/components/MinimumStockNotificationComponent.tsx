import { StyleSheet, Text, View } from 'react-native';

import { useTranslation } from 'shared/i18n';

import { formatElapsedTime } from '../domain/formatElapsedTime';

type MinimumStockNotificationComponentProps = {
  medicineName: string;
  remainingUnits: number;
  minimumUnits: number;
  minutesAgo: number;
};

// Takes raw notification data and formats it through i18n, so the caller
// doesn't have to assemble the three label strings by hand.
export function MinimumStockNotificationComponent({
  medicineName,
  remainingUnits,
  minimumUnits,
  minutesAgo,
}: MinimumStockNotificationComponentProps) {
  const { t } = useTranslation();
  const elapsed = formatElapsedTime(minutesAgo);

  return (
    <View style={styles.card}>
      <View style={styles.icon} />
      <View style={styles.content}>
        <Text style={styles.title}>
          {t('inventory.lowStock.title', { medicine: medicineName })}
        </Text>
        <Text style={styles.subtitle}>
          {t('inventory.lowStock.remaining', {
            remaining: remainingUnits,
            minimum: minimumUnits,
          })}
        </Text>
        <Text style={styles.subtitle}>
          {t(`inventory.lowStock.elapsed.${elapsed.unit}`, {
            value: elapsed.value,
          })}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    height: 83,
    padding: 12,
    width: 361,
  },
  content: {
    flex: 1,
  },
  icon: {
    backgroundColor: '#F5D76E',
    borderRadius: 5,
    height: 10,
    marginRight: 10,
    marginTop: 5,
    width: 10,
  },
  subtitle: {
    color: '#9E9E9E',
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
});
