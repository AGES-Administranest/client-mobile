import { Modal, Pressable, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';

type FeedbackSheetProps = {
  visible: boolean;
  title: string;
  message: string;
  dismissLabel: string;
  onDismiss: () => void;
};

/**
 * Sheet de aviso com uma única ação, no mesmo padrão visual do ConfirmSheet
 * (Alert.alert não funciona na web — ver ConfirmSheet). Usado para o resultado
 * da exportação para a agenda: sucesso, permissão negada ou erro.
 */
function FeedbackSheet({
  visible,
  title,
  message,
  dismissLabel,
  onDismiss,
}: FeedbackSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable
        className="flex-1 justify-end bg-background-shade"
        onPress={onDismiss}
      >
        <Pressable
          className="gap-4 rounded-t-3xl bg-background-modal px-5 pb-10 pt-4"
          onPress={e => e.stopPropagation()}
        >
          <View className="mb-2 h-1 w-10 self-center rounded-full bg-details-primary" />

          <Text className="text-xl font-bold text-label-primary">{title}</Text>
          <Text className="text-[15px] text-label-primary">{message}</Text>

          <Button shape="pill" className="h-[49px] w-full" onPress={onDismiss}>
            <Text className="font-semibold">{dismissLabel}</Text>
          </Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export { FeedbackSheet };
export type { FeedbackSheetProps };
