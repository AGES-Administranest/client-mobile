import { FileText, Upload } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { ActionButton } from 'app/components/ui';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { useTranslation } from 'shared/i18n';

import { FullScreenModal } from '../components/FullScreenModal';
import { NoticeBanner } from '../components/NoticeBanner';
import { ScreenHeader } from '../components/ScreenHeader';

type ConfirmFileScreenProps = {
  visible: boolean;
  fileName: string;
  sizeBytes: number;
  onSend: () => void;
  onReplace: () => void;
  onCancel: () => void;
};

export function ConfirmFileScreen({
  visible,
  fileName,
  sizeBytes,
  onSend,
  onReplace,
  onCancel,
}: ConfirmFileScreenProps) {
  const { t, locale } = useTranslation();

  return (
    <FullScreenModal visible={visible} onRequestClose={onCancel}>
      {/* Top bar: back and title */}
      <ScreenHeader
        title={t('stockEntry.confirmFile.title')}
        backLabel={t('stockEntry.confirmFile.back')}
        onBack={onCancel}
      />

      <View className="flex-1 gap-4 px-4">
        <Text className="text-sm text-label-tertiary">
          {t('stockEntry.confirmFile.subtitle')}
        </Text>

        {/* The picked file: name and size */}
        <View className="flex-row items-center gap-3 rounded-2xl bg-white p-4">
          <View className="h-12 w-12 items-center justify-center rounded-xl bg-details-primary">
            <Icon as={FileText} size={22} className="text-label-quartenery" />
          </View>
          <View className="flex-1 gap-0.5">
            <Text
              className="text-sm font-bold text-label-primary"
              numberOfLines={2}
            >
              {fileName}
            </Text>
            <Text className="text-xs text-label-tertiary">
              {t('stockEntry.confirmFile.meta', {
                size: formatSize(sizeBytes, locale),
              })}
            </Text>
          </View>
        </View>

        {/* What happens after sending */}
        <NoticeBanner tone="info" message={t('stockEntry.confirmFile.info')} />
      </View>

      {/* Send, replace or cancel */}
      <View className="gap-4 px-4 pb-4">
        <ActionButton
          label={t('stockEntry.confirmFile.send')}
          icon={<Icon as={Upload} size={16} />}
          onPress={onSend}
        />
        <Pressable onPress={onReplace} accessibilityRole="button">
          <Text className="text-center text-sm font-semibold text-label-quartenery">
            {t('stockEntry.confirmFile.replace')}
          </Text>
        </Pressable>
        <Pressable onPress={onCancel} accessibilityRole="button">
          <Text className="text-center text-sm text-label-tertiary">
            {t('stockEntry.confirmFile.cancel')}
          </Text>
        </Pressable>
      </View>
    </FullScreenModal>
  );
}

function formatSize(bytes: number, locale: string): string {
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${Math.max(1, Math.round(kilobytes))} KB`;
  }
  const megabytes = kilobytes / 1024;
  return `${megabytes.toLocaleString(locale, { maximumFractionDigits: 1 })} MB`;
}
