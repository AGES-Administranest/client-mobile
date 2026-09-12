import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { AuthButton } from '../components/AuthButton';
import { BrandHeader } from '../components/BrandHeader';
import { OrDivider } from '../components/OrDivider';

type WelcomeScreenProps = {
  onCreateAccount: () => void;
  onLogin: () => void;
};

export function WelcomeScreen({
  onCreateAccount,
  onLogin,
}: WelcomeScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1">
      <LinearGradient
        colors={['#EDE6F6', '#F7F2EE', '#FAF5EA']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View
        className="flex-1 items-center justify-between"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom + 40 }}
      >
        <View className="flex-1 items-center justify-center pb-8 pt-12">
          <BrandHeader
            name={t('common.appName')}
            tagline={t('auth.brand.tagline')}
          />
        </View>

        <View className="w-full items-center px-7">
          <Text className="mb-5 text-base tracking-[0.2px] text-label-quartenery">
            {t('auth.welcome.greeting')}
          </Text>
          <AuthButton
            label={t('auth.welcome.createAccount')}
            onPress={onCreateAccount}
          />
          <OrDivider label={t('auth.welcome.or')} />
          <AuthButton label={t('auth.welcome.login')} onPress={onLogin} />
        </View>
      </View>
    </View>
  );
}
