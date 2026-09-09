import { Check } from 'lucide-react-native';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import {
  ActionButton,
  EditableInventoryItemCard,
  SwipeToDelete,
} from 'shared/components';
import { useTranslation } from 'shared/i18n';
import { BackgroundShade } from 'theme/colors';

import { needsAttention, ScannedItem } from '../domain/stockItem';
import { useSheetAnimation } from '../hooks/useSheetAnimation';

type StockReviewScreenProps = {
  visible: boolean;
  items: ScannedItem[];
  onRenameItem: (id: string, name: string) => void;
  onChangeQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onConfirm: () => void;
  onClose: () => void;
};

// Bottom-sheet listing the extracted items (Figma node 31:1146). Name and
// quantity are editable, since extraction is best-effort and the user is the
// one who confirms what actually arrived.
export function StockReviewScreen({
  visible,
  items,
  onRenameItem,
  onChangeQuantity,
  onRemoveItem,
  onConfirm,
  onClose,
}: StockReviewScreenProps) {
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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View
              className="rounded-t-[20px] bg-background-modal px-5 pt-3"
              style={styles.sheet}
            >
              <View className="items-center pb-1">
                <View className="h-1 w-9 rounded-full bg-border-primary" />
              </View>

              <Text className="pb-1 text-center text-xs text-label-tertiary">
                {t(
                  items.length === 1
                    ? 'stockEntry.review.foundOne'
                    : 'stockEntry.review.found',
                  { count: items.length },
                )}
              </Text>

              <ScrollView
                style={styles.list}
                contentContainerClassName="gap-2 py-2"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {items.map(item => (
                  <SwipeToDelete
                    key={item.id}
                    deleteLabel={t('stockEntry.review.remove')}
                    onDelete={() => onRemoveItem(item.id)}
                  >
                    <EditableInventoryItemCard
                      name={item.name}
                      subtitle={[item.unit, item.dosage]
                        .filter(Boolean)
                        .join(' · ')}
                      quantity={item.quantity}
                      namePlaceholder={t('stockEntry.review.namePlaceholder')}
                      onChangeName={name => onRenameItem(item.id, name)}
                      onChangeQuantity={quantity =>
                        onChangeQuantity(item.id, quantity)
                      }
                      warning={
                        needsAttention(item)
                          ? t('stockEntry.review.checkItem')
                          : undefined
                      }
                    />
                  </SwipeToDelete>
                ))}
              </ScrollView>

              <View
                className="pt-2"
                style={{ paddingBottom: insets.bottom + 16 }}
              >
                <ActionButton
                  label={t('stockEntry.review.confirm')}
                  icon={<Icon as={Check} size={16} />}
                  onPress={onConfirm}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '85%',
  },
  list: {
    flexShrink: 1,
  },
});
