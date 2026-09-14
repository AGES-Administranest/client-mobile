import { ChevronLeft } from 'lucide-react-native';
import { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

type AuthLayoutProps = {
  title: string;
  description?: string;
  backLabel: string;
  onBack: () => void;
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
    <KeyboardAvoidingView
      className="flex-1 bg-background-modal"
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
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          hitSlop={8}
          className="ml-3 h-11 w-11 items-center justify-center"
        >
          <Icon as={ChevronLeft} className="size-7 text-label-quartenery" />
        </Pressable>

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
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1 },
});
