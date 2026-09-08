import { ScrollView, StyleSheet, Text } from 'react-native';

import { MinimumStockNotificationComponent } from '../components/MinimumStockNotificationComponent';

// ponytail: dados fixos só para conferir o visual do card.
const MOCK_NOTIFICATIONS = [
  {
    medicineName: 'Propofol 1%',
    remainingUnits: 4,
    minimumUnits: 10,
    minutesAgo: 10,
  },
  {
    medicineName: 'Dipirona 500mg',
    remainingUnits: 12,
    minimumUnits: 30,
    minutesAgo: 59,
  },
  {
    medicineName: 'Midazolam 5mg/mL',
    remainingUnits: 1,
    minimumUnits: 8,
    minutesAgo: 60,
  },
  {
    medicineName: 'Fentanila 50mcg/mL',
    remainingUnits: 0,
    minimumUnits: 15,
    minutesAgo: 245,
  },
];

export function MockedNotificationsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Notificações</Text>
      {MOCK_NOTIFICATIONS.map(notification => (
        <MinimumStockNotificationComponent
          key={notification.medicineName}
          {...notification}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    gap: 12,
    paddingVertical: 24,
  },
  heading: {
    alignSelf: 'flex-start',
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 16,
  },
});
