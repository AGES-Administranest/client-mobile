import { useEffect, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { useSheetAnimation } from 'shared/hooks/useSheetAnimation';

import {
  StockItemActions,
  StockItemForm,
  type StockItemFormLabels,
} from './StockItemForm';
import { BackgroundShade } from '../../../theme/colors';
import type { StockItem } from '../domain/stockItem';
import type { StockItemErrorCode } from '../domain/validateStockItem';
import { useEditStockItem } from '../hooks/useEditStockItem';

export type StockItemSheetLabels = StockItemFormLabels & {
  /** Error message per domain code — the screen maps codes to `t()`. */
  errors: Record<StockItemErrorCode, string>;
  confirmDelete: {
    title: string;
    message: string;
    cancel: string;
    confirm: string;
  };
};

const SHEET_MAX_HEIGHT_RATIO = 0.92;

type StockItemSheetProps = {
  /** `null` keeps the sheet closed. */
  item: StockItem | null;
  labels: StockItemSheetLabels;
  onClose: () => void;
  onSaved: (item: StockItem) => void;
  onDeleted: (id: string) => void;
};

// Bottom sheet hosting the edit form (Figma: "Novo insumo ou medicamento",
// edit variant). The backdrop fades and the sheet slides independently — see
// useSheetAnimation for why Modal's own `animationType="slide"` is not used.
export function StockItemSheet({
  item,
  labels,
  onClose,
  onSaved,
  onDeleted,
}: StockItemSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { isRendered, progress, translateY } = useSheetAnimation(item !== null);

  // `item` turns null the moment the sheet starts closing; keep the last one
  // so the form stays visible while the sheet slides down.
  const [shownItem, setShownItem] = useState(item);
  useEffect(() => {
    if (item) setShownItem(item);
  }, [item]);

  return (
    <Modal
      visible={isRendered}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.backdrop, { opacity: progress }]} />
        <Pressable
          className="flex-1"
          accessibilityRole="button"
          accessibilityLabel="close"
          onPress={onClose}
        />
        {/* Pixel max-height: a percentage would resolve against this wrapper's
            auto height and be ignored, letting the sheet outgrow the screen. */}
        <Animated.View
          style={{
            transform: [{ translateY }],
            maxHeight: windowHeight * SHEET_MAX_HEIGHT_RATIO,
          }}
        >
          <View
            className="shrink rounded-t-[20px] bg-background-modal px-5 pt-3"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <View className="items-center pb-4">
              <View className="h-1 w-9 rounded-full bg-border-primary" />
            </View>
            {shownItem ? (
              // Keyed by id so switching items resets the hook's state.
              <SheetBody
                key={shownItem.id}
                item={shownItem}
                labels={labels}
                onSaved={onSaved}
                onDeleted={onDeleted}
              />
            ) : null}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type SheetBodyProps = Omit<StockItemSheetProps, 'item' | 'onClose'> & {
  item: StockItem;
};

// Split out so the hook only runs while an item is open (hooks cannot be
// conditional), and so `key={item.id}` can remount it per item.
function SheetBody({ item, labels, onSaved, onDeleted }: SheetBodyProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const edit = useEditStockItem(item, { onSaved, onDeleted });

  const errorMessages = Object.fromEntries(
    Object.entries(edit.errors).map(([field, code]) => [
      field,
      labels.errors[code],
    ]),
  );

  if (isConfirmingDelete) {
    return (
      <View className="gap-4">
        <Text className="text-lg font-semibold text-label-primary">
          {labels.confirmDelete.title}
        </Text>
        <Text className="text-label-tertiary">
          {labels.confirmDelete.message}
        </Text>
        <View className="gap-2 pt-2">
          <Button
            shape="pill"
            variant="destructive"
            disabled={edit.isSaving}
            onPress={edit.remove}
          >
            <Text>{labels.confirmDelete.confirm}</Text>
          </Button>
          <Button
            shape="pill"
            variant="outline"
            disabled={edit.isSaving}
            onPress={() => setIsConfirmingDelete(false)}
          >
            <Text>{labels.confirmDelete.cancel}</Text>
          </Button>
        </View>
      </View>
    );
  }

  // Fields scroll; the actions stay pinned under them so Editar/Excluir are
  // reachable without scrolling on a small screen.
  return (
    <>
      <ScrollView className="shrink" keyboardShouldPersistTaps="handled">
        <StockItemForm
          values={edit.values}
          errors={errorMessages}
          labels={labels}
          onChange={edit.setField}
          onSelectCategory={edit.selectCategory}
          onSelectUnit={edit.selectUnit}
        />
      </ScrollView>
      <StockItemActions
        labels={labels}
        isSaving={edit.isSaving}
        onSubmit={edit.submit}
        onDelete={() => setIsConfirmingDelete(true)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: BackgroundShade,
    // In style rather than as a prop: the prop is deprecated on web.
    pointerEvents: 'none',
  },
});
