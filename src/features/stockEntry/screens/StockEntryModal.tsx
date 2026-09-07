import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionButton, PlusIcon, ScanTextIcon } from 'shared/components';
import { useTranslation } from 'shared/i18n';
import { BackgroundShade } from 'theme/colors';

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: BackgroundShade }}
        onPress={onClose}
      >
        {/* Stop propagation so taps inside the sheet don't close it. */}
        <Pressable
          onPress={() => {}}
          className="gap-8 rounded-t-[20px] bg-background-modal px-5 pt-3"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          <View className="items-center pb-1">
            <View className="h-1 w-9 rounded-full bg-border-primary" />
          </View>

          <View className="gap-4">
            <ActionButton
              label={t('stockEntry.menu.scanNote')}
              icon={<ScanTextIcon />}
              labelMinWidth={MENU_LABEL_MIN_WIDTH}
              onPress={onScanNote}
            />
            <ActionButton
              label={t('stockEntry.menu.attachPdf')}
              icon={<ScanTextIcon />}
              labelMinWidth={MENU_LABEL_MIN_WIDTH}
              onPress={onAttachPdf}
            />
            <ActionButton
              label={t('stockEntry.menu.typeItem')}
              icon={<PlusIcon />}
              labelMinWidth={MENU_LABEL_MIN_WIDTH}
              onPress={onTypeItem}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
