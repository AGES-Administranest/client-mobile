import { Download } from 'lucide-react-native';
import { View } from 'react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';

type InvoiceDetailRowProps = { label: string; value: string };

type InvoiceDetailSheetProps = {
  visible: boolean;
  title: string;
  closeLabel: string;
  rows: InvoiceDetailRowProps[];
  downloadLabel: string;
  downloadMessage: string | null;
  isDownloading: boolean;
  onDownload: () => void;
  onClose: () => void;
};

export function InvoiceDetailSheet({
  visible,
  title,
  closeLabel,
  rows,
  downloadLabel,
  downloadMessage,
  isDownloading,
  onDownload,
  onClose,
}: InvoiceDetailSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
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
        {downloadMessage ? (
          <Text className="text-center text-xs text-label-tertiary">
            {downloadMessage}
          </Text>
        ) : null}
        <Button
          icon={Download}
          shape="pill"
          className="h-[49px] w-full"
          disabled={isDownloading}
          onPress={onDownload}
        >
          <Text className="text-base font-semibold">{downloadLabel}</Text>
        </Button>
      </View>
    </BottomSheet>
  );
}
