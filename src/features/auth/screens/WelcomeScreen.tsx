import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { AuthButton } from '../components/AuthButton';
import { BrandHeader } from '../components/BrandHeader';
import { FormMessage } from '../components/FormMessage';
import { OrDivider } from '../components/OrDivider';
import { SocialSignInButtons } from '../components/SocialSignInButtons';
import { useSocialSignIn } from '../hooks/useSocialSignIn';

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
  const social = useSocialSignIn();

  return (
    <View
      className="flex-1 items-center justify-between bg-background-modal"
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
          disabled={social.isSubmitting}
        />
        <OrDivider label={t('auth.welcome.or')} />
        <AuthButton
          label={t('auth.welcome.login')}
          onPress={onLogin}
          disabled={social.isSubmitting}
        />

        <OrDivider label={t('auth.social.divider')} />
        <SocialSignInButtons
          labels={{
            Google: t('auth.social.google'),
            SignInWithApple: t('auth.social.apple'),
          }}
          onPress={social.signInWith}
          pendingProvider={social.pendingProvider}
          disabled={social.isSubmitting}
        />
        <FormMessage message={social.errorKey ? t(social.errorKey) : null} />
      </View>
    </View>
  );
}
