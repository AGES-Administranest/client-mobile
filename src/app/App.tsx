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
import {
  inventoryAlertDataFromItems,
  InventoryAlertObserver,
  type InventoryAlertSnapshot,
} from 'features/inventory';
import { fetchItems, MaterialsScreen } from 'features/materials';
import { ReportsScreen } from 'features/reports';
import { I18nProvider } from 'shared/i18n';
import { initNotifications } from 'shared/services';
import { subscribeToInventoryChanges } from 'shared/services/inventoryEvents';

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

export function AccountInventoryAlerts() {
  const { account, session } = useAuth();
  const userId = account?.id ?? null;
  const idToken = session?.idToken ?? null;
  const [snapshot, setSnapshot] = React.useState<InventoryAlertSnapshot>({
    status: 'loading',
    userId,
  });

  React.useEffect(() => {
    let isMounted = true;
    let latestRequest = 0;

    const loadInventory = () => {
      const request = ++latestRequest;
      setSnapshot({ status: 'loading', userId });

      if (!userId || !idToken) return;

      fetchItems(idToken)
        .then(items => {
          if (!isMounted || request !== latestRequest) return;
          setSnapshot({
            status: 'ready',
            userId,
            ...inventoryAlertDataFromItems(items),
          });
        })
        .catch(error => {
          if (!isMounted || request !== latestRequest) return;
          console.warn('[AccountInventoryAlerts] inventory load failed', error);
        });
    };

    loadInventory();
    const unsubscribe = subscribeToInventoryChanges(loadInventory);

    return () => {
      isMounted = false;
      latestRequest += 1;
      unsubscribe();
    };
  }, [idToken, userId]);

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
