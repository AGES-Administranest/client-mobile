import { Check, Send, Trash2 } from 'lucide-react-native';

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
  /** Only for a refusal the person can overrule. */
  sendAnyway?: { label: string; onPress: () => void };
  onDiscard: () => void;
  onKeep: () => void;
};

// Not the shared ConfirmSheet: it always paints the confirm brown and the
// cancel red, and here red belongs to the one action that deletes. Same
// palette as it: `secondary` is button-secondary, the default is button-primary.
export function RejectedInvoiceSheet({
  visible,
  title,
  closeLabel,
  message,
  discardLabel,
  keepLabel,
  sendAnyway,
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
            variant="secondary"
            icon={Trash2}
            className="h-[49px] w-full"
            onPress={onDiscard}
          >
            <Text className="font-semibold">{discardLabel}</Text>
          </Button>
          {sendAnyway ? (
            <Button
              shape="pill"
              variant="outline"
              icon={Send}
              className="h-[49px] w-full"
              onPress={sendAnyway.onPress}
            >
              <Text className="font-semibold">{sendAnyway.label}</Text>
            </Button>
          ) : null}
          <Button
            shape="pill"
            icon={Check}
            className="h-[49px] w-full"
            onPress={onKeep}
          >
            <Text className="font-semibold">{keepLabel}</Text>
          </Button>
        </>
      }
    >
      <Text className="text-[15px] text-label-primary">{message}</Text>
    </BottomSheet>
  );
}
