import { Eye, EyeOff, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { LabelPlaceholder } from 'theme/colors';

type PasswordFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  showLabel: string;
  hideLabel: string;
  onSubmit?: () => void;
  editable?: boolean;
};

export function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  showLabel,
  hideLabel,
  onSubmit,
  editable = true,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-label-primary">{label}</Text>
      <View className="h-14 flex-row items-center gap-3 rounded-xl border border-border-primary bg-white px-4">
        <Icon as={Lock} size={18} className="text-label-tertiary" />
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={LabelPlaceholder}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          editable={editable}
          className="flex-1 text-base text-label-primary"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? hideLabel : showLabel}
          onPress={() => setVisible(current => !current)}
          hitSlop={8}
        >
          <Icon
            as={visible ? Eye : EyeOff}
            size={20}
            className="text-label-quartenery"
          />
        </Pressable>
      </View>
    </View>
  );
}
