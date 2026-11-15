import { Download } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';

type TaxPackageDownloadProps = {
  label: string;
  message: string | null;
  isDownloading: boolean;
  onPress: () => void;
};

export function TaxPackageDownload({
  label,
  message,
  isDownloading,
  onPress,
}: TaxPackageDownloadProps) {
  return (
    <View className="gap-2">
      {message ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-center text-xs text-label-tertiary"
        >
          {message}
        </Text>
      ) : null}
      <Button
        shape="pill"
        icon={Download}
        className="h-[49px] w-full"
        disabled={isDownloading}
        onPress={onPress}
      >
        <Text>{label}</Text>
      </Button>
    </View>
  );
}
