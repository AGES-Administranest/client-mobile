import { type LucideIcon } from 'lucide-react-native';
import { Modal, Pressable, View } from 'react-native';

import { Button, type ButtonProps } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { useTranslation, type TranslationKey } from 'shared/i18n';

type OptionModalItem = {
  labelKey: TranslationKey;
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
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end bg-background-shade"
        onPress={onClose}
      >
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
              key={option.labelKey}
              onPress={option.onPress}
              icon={option.icon}
              variant={option.variant}
              shape="pill"
              className="h-[49px] w-full"
            >
              <Text className="font-medium">{t(option.labelKey)}</Text>
            </Button>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export { OptionsModal };
export type { OptionsModalProps, OptionModalItem };
