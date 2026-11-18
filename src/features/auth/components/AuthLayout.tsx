import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton } from 'app/components/ui/back-button';
import { Text } from 'app/components/ui/text';

import { Colors } from '../../../theme/colors';

type AuthLayoutProps = {
  title: string;
  description?: string;
  /** Left out on purpose where going back would reopen a spent flow (the reset success). */
  backLabel?: string;
  onBack?: () => void;
  children: ReactNode;
};

export function AuthLayout({
  title,
  description,
  backLabel,
  onBack,
  children,
}: AuthLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1">
      <LinearGradient
        colors={Colors.background.primary.colors}
        locations={Colors.background.primary.locations}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + 8,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          {onBack ? (
            <BackButton
              label={backLabel ?? ''}
              onPress={onBack}
              className="ml-3"
            />
          ) : (
            <View className="ml-3 h-11 w-11" />
          )}

          <View className="w-full px-7 pt-4">
            <Text className="text-[26px] font-bold text-label-quartenery">
              {title}
            </Text>
            {description ? (
              <Text className="mt-2 text-[15px] text-label-tertiary">
                {description}
              </Text>
            ) : null}
            <View className="mt-8 w-full">{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
});
