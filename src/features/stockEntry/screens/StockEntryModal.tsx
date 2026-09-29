import { Camera, FilePlus, Plus } from 'lucide-react-native';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from 'shared/i18n';
import { BackgroundShade } from 'theme/colors';

import { MenuOption } from '../components/MenuOption';
import { useSheetAnimation } from '../hooks/useSheetAnimation';

type StockEntryModalProps = {
  visible: boolean;
  onClose: () => void;
  onScanNote: () => void;
  onAttachPdf: () => void;
  onTypeItem: () => void;
};

export function StockEntryModal({
  visible,
  onClose,
  onScanNote,
  onAttachPdf,
  onTypeItem,
}: StockEntryModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isRendered, progress, translateY } = useSheetAnimation(visible);

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1">
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: BackgroundShade, opacity: progress },
          ]}
        />

        <Pressable className="flex-1" onPress={onClose} />

        <Animated.View style={{ transform: [{ translateY }] }}>
          <View
            className="gap-4 rounded-t-[20px] bg-background-modal px-5 pt-3"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="items-center pb-1">
              <View className="h-1 w-9 rounded-full bg-border-primary" />
            </View>

            {/* The ways to start an entry */}
            <View className="gap-3">
              <MenuOption
                icon={FilePlus}
                title={t('stockEntry.menu.attachPdf')}
                caption={t('stockEntry.menu.attachPdfCaption')}
                onPress={onAttachPdf}
              />
              <MenuOption
                icon={Camera}
                title={t('stockEntry.menu.photo')}
                caption={t('stockEntry.menu.photoCaption')}
                onPress={onScanNote}
              />
              <MenuOption
                icon={Plus}
                title={t('stockEntry.menu.typeItem')}
                caption={t('stockEntry.menu.typeItemCaption')}
                onPress={onTypeItem}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
