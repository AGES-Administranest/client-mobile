import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';

import { StockItemForm, type StockItemFormLabels } from './StockItemForm';
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

type StockItemSheetProps = {
  /** `null` keeps the sheet closed. */
  item: StockItem | null;
  labels: StockItemSheetLabels;
  onClose: () => void;
  onSaved: (item: StockItem) => void;
  onDeleted: (id: string) => void;
};

// Bottom sheet hosting the edit form (Figma: "Novo insumo ou medicamento",
// edit variant). Kept simple on purpose — a plain slide-up Modal; the animated
// backdrop from feat/US-10 can replace it once that lands.
export function StockItemSheet({
  item,
  labels,
  onClose,
  onSaved,
  onDeleted,
}: StockItemSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={item !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        className="flex-1 justify-end"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          className="flex-1 bg-background-shade"
          accessibilityRole="button"
          accessibilityLabel="close"
          onPress={onClose}
        />
        <View
          className="max-h-[90%] rounded-t-[20px] bg-background-modal px-5 pt-3"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          <View className="items-center pb-4">
            <View className="h-1 w-9 rounded-full bg-border-primary" />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {item ? (
              // Keyed by id so switching items resets the hook's state.
              <SheetBody
                key={item.id}
                item={item}
                labels={labels}
                onSaved={onSaved}
                onDeleted={onDeleted}
              />
            ) : null}
          </ScrollView>
        </View>
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

  return (
    <StockItemForm
      values={edit.values}
      errors={errorMessages}
      labels={labels}
      isSaving={edit.isSaving}
      onChange={edit.setField}
      onSelectCategory={edit.selectCategory}
      onSelectUnit={edit.selectUnit}
      onSubmit={edit.submit}
      onDelete={() => setIsConfirmingDelete(true)}
    />
  );
}
