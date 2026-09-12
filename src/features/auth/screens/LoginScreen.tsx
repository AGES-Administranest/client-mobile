import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'shared/i18n';

import { Icon } from 'app/components/ui/icon';
import { AuthButton } from '../components/AuthButton';
import { BrandHeader } from '../components/BrandHeader';
import { TextField } from '../components/TextField';
import { useAuth } from '../hooks/AuthContext';

type LoginScreenProps = {
  onBack: () => void;
  onCreateAccount?: () => void;
  onUnconfirmed?: (email: string, password: string) => void;
};

export function LoginScreen({ onBack }: LoginScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { signIn, setSession } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async () => {
    setIsSubmitting(true);
    const emailToUse = email.trim() || 'eduardo.ferrari@gmail.com';
    const passwordToUse = password || 'Password123!';

    try {
      await signIn(emailToUse, passwordToUse);
    } catch {
      // Login sem validação: garante entrada direta no app
      setSession({
        idToken: 'dev-id-token',
        accessToken: 'dev-access-token',
        refreshToken: 'dev-refresh-token',
        expiresAt: Date.now() + 3600 * 1000 * 24,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1">
      {/* Background Gradient */}
      <LinearGradient
        colors={['#EDE6F6', '#F7F2EE', '#FAF5EA']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          {/* Botão circular de voltar no canto superior esquerdo */}
          <View className="w-full px-6">
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel={t('auth.back')}
              hitSlop={10}
              className="h-10 w-10 items-center justify-center rounded-full bg-button-primary active:opacity-85 shadow-sm"
            >
              <Icon
                as={ArrowLeft}
                size={20}
                color="#FFFFFF"
                strokeWidth={2.2}
              />
            </Pressable>
          </View>

          {/* Logo e identificação visual da marca */}
          <View className="mb-8 mt-4 items-center justify-center">
            <BrandHeader
              name={t('common.appName')}
              tagline={t('auth.brand.tagline')}
            />
          </View>

          {/* Formulário com campos EMAIL e SENHA sem validação */}
          <View className="w-full px-6">
            <TextField
              label={t('auth.fields.email')}
              displayLabel="EMAIL"
              value={email}
              onChangeText={setEmail}
              placeholder="eduardo.ferrari@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="username"
              returnKeyType="next"
              editable={!isSubmitting}
            />

            <TextField
              label={t('auth.fields.password')}
              displayLabel="SENHA"
              value={password}
              onChangeText={setPassword}
              placeholder="*******"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!isSubmitting}
            />

            {/* Botão Entrar com checkmark */}
            <AuthButton
              label={t('auth.login.submit')}
              icon={Check}
              onPress={handleLogin}
              isLoading={isSubmitting}
              className="mt-6"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
});
