import { StatusBar, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StockEntryFlow } from 'features/stockEntry';
import { I18nProvider } from 'shared/i18n';

import '../../global.css';

export function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <I18nProvider>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <StockEntryFlow />
      </SafeAreaProvider>
    </I18nProvider>
  );
}
