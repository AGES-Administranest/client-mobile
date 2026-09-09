import { Plus, ScanText } from 'lucide-react-native';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from 'app/components/ui/icon';
import { ActionButton } from 'shared/components';
import { useTranslation } from 'shared/i18n';
import { BackgroundShade } from 'theme/colors';

import { useSheetAnimation } from '../hooks/useSheetAnimation';

// Shared label width for the three menu buttons: keeps their icon+label groups
// equally wide so the icons line up in a column, as they do in Figma.
const MENU_LABEL_MIN_WIDTH = 100;

type StockEntryModalProps = {
  visible: boolean;
  onClose: () => void;
  onScanNote: () => void;
  onAttachPdf: () => void;
  onTypeItem: () => void;
};

// Bottom-sheet with the 3 stock-entry options (Figma node 31:1232).
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
            className="gap-8 rounded-t-[20px] bg-background-modal px-5 pt-3"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="items-center pb-1">
              <View className="h-1 w-9 rounded-full bg-border-primary" />
            </View>

            <View className="gap-4">
              <ActionButton
                label={t('stockEntry.menu.scanNote')}
                icon={<Icon as={ScanText} size={16} />}
                labelMinWidth={MENU_LABEL_MIN_WIDTH}
                onPress={onScanNote}
              />
              <ActionButton
                label={t('stockEntry.menu.attachPdf')}
                icon={<Icon as={ScanText} size={16} />}
                labelMinWidth={MENU_LABEL_MIN_WIDTH}
                onPress={onAttachPdf}
              />
              <ActionButton
                label={t('stockEntry.menu.typeItem')}
                icon={<Icon as={Plus} size={16} />}
                labelMinWidth={MENU_LABEL_MIN_WIDTH}
                onPress={onTypeItem}
              />
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
