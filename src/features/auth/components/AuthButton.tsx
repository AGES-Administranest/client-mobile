import { ActivityIndicator } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import { ButtonPrimary, LabelSecondary } from '../../../theme/colors';

type AuthButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'link';
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
};

const BUTTON_CLASSES: Record<
  NonNullable<AuthButtonProps['variant']>,
  string
> = {
  primary: 'my-1.5 h-14 w-full bg-button-primary shadow-md active:opacity-80',
  outline:
    'my-1.5 h-14 w-full border border-border-primary bg-transparent active:opacity-70',
  link: 'h-11',
};

const TEXT_CLASSES: Record<NonNullable<AuthButtonProps['variant']>, string> = {
  primary: 'text-[17px] font-semibold tracking-[0.3px] text-label-secondary',
  outline: 'text-[16px] font-medium text-label-primary',
  link: 'text-[15px] font-medium text-label-quartenery',
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
      variant={variant === 'link' ? 'link' : 'default'}
      shape="pill"
      onPress={onPress}
      disabled={disabled || isLoading}
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || isLoading, busy: isLoading }}
      className={cn(BUTTON_CLASSES[variant], className)}
    >
      {isLoading ? (
        <ActivityIndicator color={isPrimary ? LabelSecondary : ButtonPrimary} />
      ) : (
        <Text className={TEXT_CLASSES[variant]}>{label}</Text>
      )}
    </Button>
  );
}
