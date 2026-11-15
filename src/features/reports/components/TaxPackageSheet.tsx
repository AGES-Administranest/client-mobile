import { ActivityIndicator, View } from 'react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { NoticeBanner } from 'app/components/ui/notice-banner';
import { Text } from 'app/components/ui/text';

type Figure = { label: string; value: string };

type TaxPackageSheetProps = {
  visible: boolean;
  title: string;
  closeLabel: string;
  downloadLabel: string;
  /** Shown while the summary is on its way; null once it arrived. */
  loadingLabel: string | null;
  figures: readonly Figure[];
  /** Documents of the period whose file is not on the server yet. */
  warning: string | null;
  error: string | null;
  canDownload: boolean;
  isDownloading: boolean;
  onDownload: () => void;
  onClose: () => void;
};

/** The summary of the invoice package, checked before downloading (US30). */
export function TaxPackageSheet({
  visible,
  title,
  closeLabel,
  downloadLabel,
  loadingLabel,
  figures,
  warning,
  error,
  canDownload,
  isDownloading,
  onDownload,
  onClose,
}: TaxPackageSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
      footer={
        <Button
          shape="pill"
          className="h-[49px] w-full"
          disabled={!canDownload || isDownloading}
          onPress={onDownload}
        >
          {isDownloading ? <ActivityIndicator color="white" /> : null}
          <Text>{downloadLabel}</Text>
        </Button>
      }
    >
      {loadingLabel !== null ? (
        <View
          accessibilityLiveRegion="polite"
          className="flex-row items-center gap-2"
        >
          <ActivityIndicator />
          <Text className="text-sm text-label-tertiary">{loadingLabel}</Text>
        </View>
      ) : null}
      {figures.map(figure => (
        <View
          key={figure.label}
          className="flex-row items-center justify-between rounded-lg border border-border-primary bg-white px-3 py-3"
        >
          <Text className="text-sm text-label-tertiary">{figure.label}</Text>
          <Text className="text-sm font-semibold text-label-primary">
            {figure.value}
          </Text>
        </View>
      ))}
      {warning ? <NoticeBanner tone="warning" message={warning} /> : null}
      {error ? (
        <View accessibilityLiveRegion="polite">
          <NoticeBanner tone="alert" message={error} />
        </View>
      ) : null}
    </BottomSheet>
  );
}
