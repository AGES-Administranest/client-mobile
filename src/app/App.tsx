import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { StatusBar, StyleSheet, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { Button } from 'app/components/ui/button';
import { TabBar, type TabValue } from 'app/components/ui/tabbar';
import { Text } from 'app/components/ui/text';
import { AppointmentFormScreen, type Appointment } from 'features/appointments';
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
  InventoryAlertObserver,
  type InventoryAlertSnapshot,
} from 'features/inventory';
import { MaterialsScreen } from 'features/materials';
import { ReportsScreen } from 'features/reports';
import { I18nProvider, useTranslation } from 'shared/i18n';
import { initNotifications } from 'shared/services';
import { toCalendarDate } from 'shared/utils/calendar';

import { Colors } from '../theme/colors';
import '../../global.css';

// Atalho de desenvolvimento: com EXPO_PUBLIC_PREVIEW_SCREEN=appointmentForm no
// .env o app abre direto na folha de agendamento, sem passar pelo login,
// porque ainda não existe fluxo que leve até ela. Sem a variável (o caso do
// .env.example e dos testes) nada muda. Remover quando o fluxo existir.
const PREVIEW_SCREEN = process.env.EXPO_PUBLIC_PREVIEW_SCREEN;

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

function AppointmentFormPreview() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = React.useState(true);
  const [editing, setEditing] = React.useState<Appointment | null>(null);
  const [saved, setSaved] = React.useState<Appointment | null>(null);

  const open = (appointment: Appointment | null) => {
    setEditing(appointment);
    setIsOpen(true);
  };

  return (
    <View className="flex-1" style={{ paddingTop: insets.top }}>
      <LinearGradient
        colors={Colors.background.primary.colors}
        locations={Colors.background.primary.locations}
        style={StyleSheet.absoluteFill}
      />
      <View className="flex-1 items-center justify-center gap-4 px-6">
        <Button shape="pill" className="h-12 px-6" onPress={() => open(null)}>
          <Text>{t('appointments.form.titleCreate')}</Text>
        </Button>
        {saved ? (
          <>
            <Button
              shape="pill"
              variant="outline"
              className="h-12 px-6"
              onPress={() => open(saved)}
            >
              <Text>{t('appointments.form.titleEdit')}</Text>
            </Button>
            <Text className="text-center text-sm text-label-tertiary">
              {saved.patientName} · {saved.startsAt}
            </Text>
          </>
        ) : null}
      </View>
      <AppointmentFormScreen
        visible={isOpen}
        appointment={editing}
        selectedDate={toCalendarDate(new Date())}
        onClose={() => setIsOpen(false)}
        onSaved={setSaved}
      />
    </View>
  );
}

function AppContent() {
  const { session, account } = useAuth();
  const [tab, setTab] = React.useState<TabValue>('day');
  const insets = useSafeAreaInsets();

  if (PREVIEW_SCREEN === 'appointmentForm') {
    return <AppointmentFormPreview />;
  }

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
