import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { NoticeBanner } from 'app/components/ui/notice-banner';

type OfflineNoticeSheetProps = {
  visible: boolean;
  title: string;
  closeLabel: string;
  message: string;
  manualLabel: string;
  onManual: () => void;
  onClose: () => void;
  onClosed: () => void;
};

export function OfflineNoticeSheet({
  visible,
  title,
  closeLabel,
  message,
  manualLabel,
  onManual,
  onClose,
  onClosed,
}: OfflineNoticeSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
      onClosed={onClosed}
    >
      <NoticeBanner
        tone="warning"
        message={message}
        actionLabel={manualLabel}
        onAction={onManual}
      />
    </BottomSheet>
  );
}
