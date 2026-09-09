import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { ActionButton } from 'shared/components';
import { useTranslation } from 'shared/i18n';

import { ScanFrame } from '../components/ScanFrame';

type ScanScreenProps = {
  /** Called with the uri of the captured photo. */
  onCapture: (imageUri: string) => void;
  onPickFromLibrary: () => void;
  onCancel: () => void;
};

// Full-screen capture (Figma node 31:1015): live camera behind the yellow
// instruction banner and the brown corner frame.
export function ScanScreen({
  onCapture,
  onPickFromLibrary,
  onCancel,
}: ScanScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const handleCapture = async () => {
    if (isCapturing) {
      return;
    }
    setIsCapturing(true);
    try {
      // Full quality: the invoice's small print is what the OCR has to read.
      const photo = await camera.current?.takePictureAsync({ quality: 1 });
      if (photo?.uri) {
        onCapture(photo.uri);
      }
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View className="flex-1 bg-[#1c1b1a]">
      <StatusBar barStyle="light-content" />

      {permission?.granted ? (
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="back"
        />
      ) : null}

      <View style={{ paddingTop: insets.top }}>
        <View className="bg-details-tertiary px-6 py-4">
          <Text className="text-center text-sm text-label-primary">
            {permission?.granted
              ? t('stockEntry.scan.instruction')
              : t('stockEntry.scan.permission')}
          </Text>
        </View>
      </View>

      <ScanFrame />

      <View
        className="gap-3 px-5"
        style={{ paddingBottom: insets.bottom + 24 }}
      >
        {permission?.granted ? (
          <ActionButton
            label={t('stockEntry.scan.capture')}
            icon={<Icon as={Camera} size={16} />}
            onPress={handleCapture}
            disabled={isCapturing}
          />
        ) : (
          <ActionButton
            label={t('stockEntry.scan.allowCamera')}
            icon={<Icon as={Camera} size={16} />}
            onPress={requestPermission}
          />
        )}

        <Pressable
          role="button"
          accessibilityRole="button"
          onPress={onPickFromLibrary}
          className="h-10 items-center justify-center active:opacity-70"
        >
          <Text className="text-sm font-medium text-label-secondary">
            {t('stockEntry.scan.fromLibrary')}
          </Text>
        </Pressable>

        <Pressable
          role="button"
          accessibilityRole="button"
          onPress={onCancel}
          className="h-10 items-center justify-center active:opacity-70"
        >
          <Text className="text-sm font-medium text-label-secondary">
            {t('stockEntry.scan.cancel')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
