import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

type GreetingCardProps = {
  greeting: string;
  isLoading: boolean;
};

// Presentational only — the loading/loaded decision lives here, but the
// data (greeting text, isLoading) comes in as props from the screen's hook.
export function GreetingCard({ greeting, isLoading }: GreetingCardProps) {
  if (isLoading) {
    return <ActivityIndicator style={styles.spinner} />;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.greeting}>{greeting}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
  },
  greeting: {
    fontSize: 18,
  },
  spinner: {
    marginTop: 16,
  },
});
