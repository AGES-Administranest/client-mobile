import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { StatusBar, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { TabBar, type TabValue } from 'app/components/ui/tabbar';
import { ClinicsScreen } from 'features/clinics';
import { FinanceScreen } from 'features/finance';
import { HomeScreen } from 'features/home';
import { MaterialsScreen } from 'features/materials';
import { ReportsScreen } from 'features/reports';
import { I18nProvider } from 'shared/i18n';

import { Colors } from '../theme/colors';
import '../../global.css';

const SCREENS: Record<TabValue, React.ComponentType> = {
  day: HomeScreen,
  finance: FinanceScreen,
  materials: MaterialsScreen,
  clinics: ClinicsScreen,
  reports: ReportsScreen,
};

function AppContent() {
  const isDarkMode = useColorScheme() === 'dark';
  const [tab, setTab] = React.useState<TabValue>('day');
  const insets = useSafeAreaInsets();
  const Screen = SCREENS[tab];
  const gradientStyle = { flex: 1, paddingTop: insets.top };
  const tabBarWrapperStyle = { paddingBottom: insets.bottom };

  return (
    <LinearGradient
      colors={Colors.background.primary.colors}
      locations={Colors.background.primary.locations}
      style={gradientStyle}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Screen />
      <View style={tabBarWrapperStyle}>
        <TabBar value={tab} onValueChange={setTab} className="mx-4 mb-[25px]" />
      </View>
    </LinearGradient>
  );
}

export function App() {
  return (
    <I18nProvider>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </I18nProvider>
  );
}
