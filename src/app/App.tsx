import * as React from 'react';
import { StatusBar, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TabBar, type TabValue } from 'app/components/ui/tabbar';
import { WelcomeScreen } from 'features/welcome/WelcomeScreen';
import { ClinicsScreen } from 'features/clinics';
import { FinanceScreen } from 'features/finance';
import { HomeScreen } from 'features/home';
import { MaterialsScreen } from 'features/materials';
import { ReportsScreen } from 'features/reports';
import { I18nProvider } from 'shared/i18n';

import '../../global.css';

const SCREENS: Record<TabValue, React.ComponentType> = {
  day: HomeScreen,
  finance: FinanceScreen,
  materials: MaterialsScreen,
  clinics: ClinicsScreen,
  reports: ReportsScreen,
};

export function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  const [tab, setTab] = React.useState<TabValue>('day');
  const Screen = SCREENS[tab];

  if (!isAuthenticated) {
    return (
      <I18nProvider>
        <SafeAreaProvider>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <WelcomeScreen
            onCreateAccount={() => setIsAuthenticated(true)}
            onLogin={() => setIsAuthenticated(true)}
          />
        </SafeAreaProvider>
      </I18nProvider>
    );
  }

  return (
    <I18nProvider>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View className="flex-1">
          <Screen />
          <TabBar
            value={tab}
            onValueChange={setTab}
            className="mx-4 mb-[25px]"
          />
        </View>
      </SafeAreaProvider>
    </I18nProvider>
  );
}
