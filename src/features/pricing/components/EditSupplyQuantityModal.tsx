import { useEffect, useState } from 'react';
import { Modal, Pressable, TextInput, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { Text } from 'app/components/ui/text';
import { LabelTertiary } from 'theme/colors';

import type { ProcedureSelectedSupply } from '../domain/pricing.types';

export type EditSupplyQuantityModalProps = {
  visible: boolean;
  supply: ProcedureSelectedSupply | null;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
};

export function EditSupplyQuantityModal({
  visible,
  supply,
  onConfirm,
  onClose,
  title,
  confirmLabel,
  cancelLabel,
}: EditSupplyQuantityModalProps) {
  const [quantityText, setQuantityText] = useState('');

  useEffect(() => {
    if (supply) {
      setQuantityText(String(supply.quantity));
    }
  }, [supply]);

  if (!supply) return null;

  function handleConfirm(): void {
    const parsed = Number.parseFloat(quantityText.replace(',', '.'));
    if (!Number.isNaN(parsed) && parsed > 0) {
      onConfirm(parsed);
      onClose();
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-center bg-background-shade px-6"
        onPress={onClose}
      >
        <Pressable
          className="w-full max-w-sm gap-4 rounded-2xl bg-white p-5 shadow-lg"
          onPress={e => e.stopPropagation()}
        >
          <Text className="text-base font-bold text-label-body">{title}</Text>

          <View className="gap-1">
            <Text className="text-sm font-semibold text-label-body">
              {supply.name}
            </Text>
            <Text className="text-xs text-label-muted">{supply.unit}</Text>
          </View>

          <View className="h-12 flex-row items-center rounded-xl border border-border-warm bg-white px-3">
            <TextInput
              value={quantityText}
              onChangeText={setQuantityText}
              keyboardType="numeric"
              autoFocus
              placeholder="0"
              placeholderTextColor={LabelTertiary}
              className="flex-1 text-base font-semibold text-label-primary"
            />
          </View>

          <View className="flex-row items-center gap-2 pt-2">
            <Button
              shape="pill"
              variant="outline"
              onPress={onClose}
              className="flex-1 h-11"
            >
              <Text className="text-xs font-semibold text-label-body">
                {cancelLabel}
              </Text>
            </Button>
            <Button
              shape="pill"
              variant="default"
              onPress={handleConfirm}
              className="flex-1 h-11 bg-button-primary"
            >
              <Text className="text-xs font-semibold text-label-secondary">
                {confirmLabel}
              </Text>
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

