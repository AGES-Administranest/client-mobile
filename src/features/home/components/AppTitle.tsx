import { StyleSheet, Text, View } from 'react-native';

type AppTitleProps = {
  title: string;
  subtitle: string;
};

// Presentational only — takes already-translated strings as props, no
// direct dependency on i18n/services. Reusable within this feature.
export function AppTitle({ title, subtitle }: AppTitleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  subtitle: {
    color: '#666666',
    fontSize: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
});
