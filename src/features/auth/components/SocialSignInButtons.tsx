import { View } from 'react-native';

import { AuthButton } from './AuthButton';
import { SOCIAL_PROVIDERS, SocialProvider } from '../domain/socialSignIn';

type SocialSignInButtonsProps = {
  labels: Record<SocialProvider, string>;
  onPress: (provider: SocialProvider) => void;
  pendingProvider: SocialProvider | null;
  disabled?: boolean;
};

export function SocialSignInButtons({
  labels,
  onPress,
  pendingProvider,
  disabled = false,
}: SocialSignInButtonsProps) {
  return (
    <View className="w-full">
      {SOCIAL_PROVIDERS.map(provider => (
        <AuthButton
          key={provider}
          variant="outline"
          label={labels[provider]}
          onPress={() => onPress(provider)}
          isLoading={pendingProvider === provider}
          disabled={disabled}
        />
      ))}
    </View>
  );
}
