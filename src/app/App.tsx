import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from 'features/home';
import { I18nProvider } from 'shared/i18n';

export function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <I18nProvider>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <HomeScreen />
      </SafeAreaProvider>
    </I18nProvider>
  );
}
