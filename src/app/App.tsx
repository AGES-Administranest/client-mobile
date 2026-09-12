import { LinearGradient } from 'expo-linear-gradient';
import * as React from 'react';
import { StatusBar, useColorScheme, View } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { TabBar, type TabValue } from 'app/components/ui/tabbar';
import { provisionSession } from 'features/auth';
import { ClinicsScreen } from 'features/clinics';
import { FinanceScreen } from 'features/finance';
import { HomeScreen } from 'features/home';
import { MaterialsScreen } from 'features/materials';
import { ReportsScreen } from 'features/reports';
import { I18nProvider } from 'shared/i18n';
import { sessionStore } from 'shared/services/sessionStore';

import { Colors } from '../theme/colors';
import '../../global.css';

const devUserId = process.env.EXPO_PUBLIC_DEV_USER_ID;
const devIdToken = process.env.EXPO_PUBLIC_DEV_ID_TOKEN;

// As rotas de estoque filtram por User.id, que é um UUID do banco — não o
// `sub` do Cognito. Quem faz essa tradução é POST /auth/session, então com
// só o idToken em mãos é ele que diz qual é o userId. EXPO_PUBLIC_DEV_USER_ID
// continua valendo como atalho para pular a ida até o servidor.
function useDevSession(): boolean {
  const [isReady, setIsReady] = React.useState(!devIdToken);

  React.useEffect(() => {
    if (!devIdToken) return;

    if (devUserId) {
      sessionStore.set({ userId: devUserId, idToken: devIdToken });
      setIsReady(true);
      return;
    }

    let isMounted = true;
    provisionSession(devIdToken)
      .then(user => {
        if (isMounted) {
          sessionStore.set({ userId: user.id, idToken: devIdToken });
        }
      })
      .catch(() => {
        // Sem sessão os services falham com uma mensagem explícita; deixar
        // a app subir é melhor do que travar na tela inicial.
      })
      .finally(() => {
        if (isMounted) setIsReady(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return isReady;
}

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
  // As telas carregam dados no mount: só montar depois da sessão resolvida
  // evita um primeiro fetch que só pode falhar.
  const isSessionReady = useDevSession();

  return (
    <I18nProvider>
      <SafeAreaProvider>{isSessionReady && <AppContent />}</SafeAreaProvider>
    </I18nProvider>
  );
}
