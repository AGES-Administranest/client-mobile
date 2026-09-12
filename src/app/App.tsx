import * as React from 'react';
import { StatusBar, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TabBar, type TabValue } from 'app/components/ui/tabbar';
import { AuthFlow, AuthProvider, useAuth } from 'features/auth';
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

  return (
    <I18nProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <AppContent />
        </AuthProvider>
      </SafeAreaProvider>
    </I18nProvider>
  );
}

function AppContent() {
  const { session } = useAuth();
  const [tab, setTab] = React.useState<TabValue>('day');

  if (!session) {
    return <AuthFlow />;
  }

  const Screen = SCREENS[tab];

  return (
    <View className="flex-1">
      <Screen />
      <TabBar value={tab} onValueChange={setTab} className="mx-4 mb-[25px]" />
    </View>
  );
}
