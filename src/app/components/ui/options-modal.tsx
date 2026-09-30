import { type LucideIcon } from 'lucide-react-native';
import { Animated, Modal, Pressable, View } from 'react-native';

import { Button, type ButtonProps } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { useSheetAnimation } from 'shared/hooks/useSheetAnimation';

type OptionModalItem = {
  /** Já traduzido por quem chama. */
  label: string;
  icon: LucideIcon;
  variant?: ButtonProps['variant'];
  onPress: () => void;
};

type OptionsModalProps = {
  visible: boolean;
  onClose: () => void;
  options: readonly OptionModalItem[];
  className?: string;
};

function OptionsModal({
  visible,
  onClose,
  options,
  className,
}: OptionsModalProps) {
  const sheet = useSheetAnimation(visible, onClose);

  return (
    <Modal
      visible={sheet.isRendered}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={{ flex: 1, opacity: sheet.progress }}>
        <Pressable
          className="flex-1 justify-end bg-background-shade"
          onPress={onClose}
        >
          <Animated.View style={sheet.sheetStyle} {...sheet.panHandlers}>
            <Pressable
              className={cn(
                'gap-4 rounded-t-3xl bg-background-modal px-5 pb-10 pt-4',
                className,
              )}
              onPress={e => e.stopPropagation()}
            >
              <View className="mb-6 h-1 w-10 self-center rounded-full bg-border-primary" />
              {options.map(option => (
                <Button
                  key={option.label}
                  onPress={option.onPress}
                  icon={option.icon}
                  variant={option.variant}
                  shape="pill"
                  className="h-[49px] w-full"
                >
                  <Text className="font-medium">{option.label}</Text>
                </Button>
              ))}
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

export { OptionsModal };
export type { OptionsModalProps, OptionModalItem };
