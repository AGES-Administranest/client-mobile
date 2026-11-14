import { Download, FileText } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import type { DownloadAvailability } from '../domain/invoiceDownload';
import type { InvoiceSyncStatus } from '../domain/serviceInvoiceRecord.types';

export type InvoiceFileCardTexts = {
  download: string;
  downloading: string;
  saved: string;
  statusLabel: string;
  unavailable: Record<Exclude<DownloadAvailability, 'ready'>, string>;
  downloadFailed: string;
};

type InvoiceFileCardProps = {
  fileName: string;
  fileDetails: string;
  status: InvoiceSyncStatus;
  availability: DownloadAvailability;
  isDownloading: boolean;
  downloadFailed: boolean;
  isSaved: boolean;
  texts: InvoiceFileCardTexts;
  onDownload: () => void;
};

export function InvoiceFileCard({
  fileName,
  fileDetails,
  status,
  availability,
  isDownloading,
  downloadFailed,
  isSaved,
  texts,
  onDownload,
}: InvoiceFileCardProps) {
  const isReady = availability === 'ready';
  const notice = isReady ? null : texts.unavailable[availability];

  return (
    <View className="gap-3 rounded-2xl bg-white p-4 shadow-md shadow-black/10">
      <View className="flex-row items-center gap-3">
        <View className="size-12 items-center justify-center rounded-xl bg-details-primary">
          <Icon as={FileText} size={22} className="text-label-quartenery" />
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <Text
            numberOfLines={1}
            className="text-sm font-bold text-label-primary"
          >
            {fileName}
          </Text>
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-xs text-label-tertiary">{fileDetails}</Text>
            <InvoiceStatusBadge status={status} label={texts.statusLabel} />
          </View>
        </View>
      </View>

      <Button
        shape="pill"
        icon={Download}
        disabled={!isReady || isDownloading}
        accessibilityLabel={texts.download}
        className="h-[46px] w-full"
        onPress={onDownload}
      >
        <Text className="font-semibold">
          {isDownloading ? texts.downloading : texts.download}
        </Text>
      </Button>

      {isSaved ? (
        <Text className="text-xs leading-4 text-label-tertiary">
          {texts.saved}
        </Text>
      ) : null}
      {notice ? (
        <Text className="text-xs leading-4 text-label-tertiary">{notice}</Text>
      ) : null}
      {downloadFailed ? (
        <Text className="text-xs leading-4 text-alert-primary">
          {texts.downloadFailed}
        </Text>
      ) : null}
    </View>
  );
}
