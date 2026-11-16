import { ArrowLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { cn } from 'app/lib/utils';

type BackButtonProps = {
  label: string;
  onPress?: () => void;
  className?: string;
};

// The one back button of the app: a round brown button with only the arrow.
function BackButton({ label, onPress, className }: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      className={cn(
        'size-9 items-center justify-center rounded-full bg-button-primary active:opacity-80',
        className,
      )}
    >
      <Icon as={ArrowLeft} size={20} className="text-label-secondary" />
    </Pressable>
  );
}

export { BackButton };
