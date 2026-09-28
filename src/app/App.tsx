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
import { FinanceScreen } from 'features/finance';
import { HomeScreen } from 'features/home';
import {
  InventoryAlertObserver,
  type InventoryAlertSnapshot,
} from 'features/inventory';
import { MaterialsScreen } from 'features/materials';
import { PartnersScreen } from 'features/partners';
import { ReportsScreen } from 'features/reports';
import { I18nProvider } from 'shared/i18n';
import { initNotifications } from 'shared/services';

import { Colors } from '../theme/colors';
import '../../global.css';

const SCREENS: Record<TabValue, React.ComponentType> = {
  day: HomeScreen,
  finance: FinanceScreen,
  materials: MaterialsScreen,
  partners: PartnersScreen,
  reports: ReportsScreen,
};

export function App() {
  const isDarkMode = useColorScheme() === 'dark';

  React.useEffect(() => {
    initNotifications();
  }, []);

  return (
    <I18nProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
          <AccountInventoryAlerts />
          <AppContent />
        </AuthProvider>
      </SafeAreaProvider>
    </I18nProvider>
  );
}

// Inventory alerts are stored per user (alert timestamps, dismissed alerts,
// expiry schedules), keyed by the signed-in account's id in the API. This
// stays mounted across sign out and sign in on purpose: the observer only
// cancels the previous person's scheduled notifications when it sees the id
// change (to null on sign out, or to another account), which an unmount would
// skip. Inventory data is still 'loading' until US09 loads it from the API.
export function AccountInventoryAlerts() {
  const { account } = useAuth();
  const snapshot = React.useMemo<InventoryAlertSnapshot>(
    () => ({ status: 'loading', userId: account?.id ?? null }),
    [account?.id],
  );

  return <InventoryAlertObserver snapshot={snapshot} />;
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
