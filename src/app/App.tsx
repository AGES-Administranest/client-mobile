import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { TabBar, type TabValue } from 'app/components/ui/tabbar';
import {
  AuthFlow,
  AuthProvider,
  needsTermsAcceptance,
  TermsScreen,
  useAuth,
} from 'features/auth';
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
  const { session, account } = useAuth();
  const [tab, setTab] = React.useState<TabValue>('day');
  const insets = useSafeAreaInsets();

  if (!session || !account) {
    return <AuthFlow />;
  }

  // No use of the app without consent to the current terms (US25).
  if (needsTermsAcceptance(account)) {
    return <TermsScreen />;
  }

  const Screen = SCREENS[tab];
  const tabBarWrapperStyle = { paddingBottom: insets.bottom };

  return (
    <View className="flex-1" style={{ paddingTop: insets.top }}>
      <LinearGradient
        colors={Colors.background.primary.colors}
        locations={Colors.background.primary.locations}
        style={StyleSheet.absoluteFill}
      />
      <Screen />
      <View style={tabBarWrapperStyle}>
        <TabBar value={tab} onValueChange={setTab} className="mx-4 mb-[25px]" />
      </View>
    </View>
  );
}
