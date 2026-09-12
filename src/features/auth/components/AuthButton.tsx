import { ActivityIndicator } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import { ButtonPrimary, LabelSecondary } from '../../../theme/colors';

type AuthButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'link';
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
};

export function AuthButton({
  label,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  className,
}: AuthButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Button
      variant={isPrimary ? 'default' : 'link'}
      shape="pill"
      onPress={onPress}
      disabled={disabled || isLoading}
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || isLoading, busy: isLoading }}
      className={cn(
        isPrimary
          ? 'my-1.5 h-14 w-full bg-button-primary shadow-md active:opacity-80'
          : 'h-11',
        className,
      )}
    >
      {isLoading ? (
        <ActivityIndicator color={isPrimary ? LabelSecondary : ButtonPrimary} />
      ) : (
        <Text
          className={
            isPrimary
              ? 'text-[17px] font-semibold tracking-[0.3px] text-label-secondary'
              : 'text-[15px] font-medium text-label-quartenery'
          }
        >
          {label}
        </Text>
      )}
    </Button>
  );
}
