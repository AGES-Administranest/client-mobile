import { Download, Trash2 } from 'lucide-react-native';
import { View } from 'react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';

type ReportDetailRow = { label: string; value: string };

type ReportDetailSheetProps = {
  visible: boolean;
  title: string;
  closeLabel: string;
  rows: ReportDetailRow[];
  openLabel: string;
  statusMessage: string | null;
  isBusy: boolean;
  deleteLabel: string;
  onOpen: () => void;
  onDelete: () => void;
  onClose: () => void;
  onClosed: () => void;
};

export function ReportDetailSheet({
  visible,
  title,
  closeLabel,
  rows,
  openLabel,
  statusMessage,
  isBusy,
  deleteLabel,
  onOpen,
  onDelete,
  onClose,
  onClosed,
}: ReportDetailSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
      onClosed={onClosed}
    >
      <View className="gap-3 pb-2">
        {rows.map(row => (
          <View key={row.label} className="gap-1">
            <Text className="text-xs font-semibold uppercase text-label-primary">
              {row.label}
            </Text>
            <View className="rounded-[10px] border border-border-primary bg-white px-4 py-3">
              <Text className="text-sm font-medium text-label-primary">
                {row.value}
              </Text>
            </View>
          </View>
        ))}
        {statusMessage ? (
          <Text className="text-center text-xs text-label-tertiary">
            {statusMessage}
          </Text>
        ) : null}
        <Button
          icon={Download}
          shape="pill"
          className="h-[49px] w-full"
          disabled={isBusy}
          onPress={onOpen}
        >
          <Text className="text-base font-semibold">{openLabel}</Text>
        </Button>
        <Button
          icon={Trash2}
          shape="pill"
          variant="secondary"
          className="h-[49px] w-full"
          disabled={isBusy}
          onPress={onDelete}
        >
          <Text className="text-base font-semibold">{deleteLabel}</Text>
        </Button>
      </View>
    </BottomSheet>
  );
}
