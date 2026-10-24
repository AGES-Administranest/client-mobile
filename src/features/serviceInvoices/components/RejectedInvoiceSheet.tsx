import { Trash2, X } from 'lucide-react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';

type RejectedInvoiceSheetProps = {
  visible: boolean;
  title: string;
  closeLabel: string;
  message: string;
  discardLabel: string;
  keepLabel: string;
  onDiscard: () => void;
  onKeep: () => void;
};

// Not the shared ConfirmSheet: it always paints the confirm brown and the
// cancel red, and here red belongs to the one action that deletes.
export function RejectedInvoiceSheet({
  visible,
  title,
  closeLabel,
  message,
  discardLabel,
  keepLabel,
  onDiscard,
  onKeep,
}: RejectedInvoiceSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      title={title}
      closeLabel={closeLabel}
      onClose={onKeep}
      footer={
        <>
          <Button
            shape="pill"
            variant="destructive"
            icon={Trash2}
            className="h-[49px] w-full"
            onPress={onDiscard}
          >
            <Text className="font-semibold">{discardLabel}</Text>
          </Button>
          <Button
            shape="pill"
            variant="outline"
            icon={X}
            className="h-[49px] w-full border-border-primary bg-white"
            onPress={onKeep}
          >
            <Text className="font-semibold text-label-primary">
              {keepLabel}
            </Text>
          </Button>
        </>
      }
    >
      <Text className="text-[15px] text-label-primary">{message}</Text>
    </BottomSheet>
  );
}
