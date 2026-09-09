import { Text, View } from 'react-native';

type AppTitleProps = {
  title: string;
  subtitle: string;
};

// Presentational only — takes already-translated strings as props, no
// direct dependency on i18n/services. Reusable within this feature.
export function AppTitle({ title, subtitle }: AppTitleProps) {
  return (
    <View className="items-center">
      <Text className="mb-2 text-2xl font-semibold text-alert-primary">
        {title}
      </Text>
      <Text className="text-base text-label-tertiary">{subtitle}</Text>
    </View>
  );
}
