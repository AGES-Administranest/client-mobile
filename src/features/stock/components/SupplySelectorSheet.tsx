import { Check, Search } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';

import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

import { LabelPrimary, LabelTertiary } from '../../../theme/colors';
import type { SupplyOption } from '../domain/supplySelection';

type SupplySelectorSheetProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  term: string;
  onTermChange: (term: string) => void;
  options: readonly SupplyOption[];
  isLoading: boolean;
  hasError: boolean;
  isTermTooShort: boolean;
  selected: SupplyOption | null;
  onSelect: (option: SupplyOption) => void;
  quantity: string;
  onQuantityChange: (quantity: string) => void;
  isOverBalance: boolean;
  canSubmit: boolean;
  title: string;
  materialLabel: string;
  searchPlaceholder: string;
  quantityLabel: string;
  confirmLabel: string;
  closeLabel: string;
  emptyMessage: string;
  errorMessage: string;
  loadingMessage: string;
  termTooShortMessage: string;
  overBalanceMessage: string;
  /**
   * Cada linha traz o preço do seu próprio item, então o texto não cabe numa
   * prop já pronta. Quem chama passa a função e mantém a formatação fora
   * daqui, como manda a separação de componentes.
   */
  formatPrice: (option: SupplyOption) => string;
};

function ListMessage({ message }: { message: string }) {
  return (
    <View className="px-4 py-6">
      <Text className="text-center text-[13px] text-label-tertiary">
        {message}
      </Text>
    </View>
  );
}

function SupplySelectorSheet({
  visible,
  onClose,
  onConfirm,
  term,
  onTermChange,
  options,
  isLoading,
  hasError,
  isTermTooShort,
  selected,
  onSelect,
  quantity,
  onQuantityChange,
  isOverBalance,
  canSubmit,
  title,
  materialLabel,
  searchPlaceholder,
  quantityLabel,
  confirmLabel,
  closeLabel,
  emptyMessage,
  errorMessage,
  loadingMessage,
  termTooShortMessage,
  overBalanceMessage,
  formatPrice,
}: SupplySelectorSheetProps) {
  function renderList() {
    if (hasError) {
      return <ListMessage message={errorMessage} />;
    }
    if (isTermTooShort) {
      return <ListMessage message={termTooShortMessage} />;
    }
    if (isLoading) {
      return <ListMessage message={loadingMessage} />;
    }
    if (options.length === 0) {
      return <ListMessage message={emptyMessage} />;
    }

    return options.map((option, index) => {
      const isSelected = selected?.id === option.id;

      return (
        <Pressable
          key={option.id}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
          onPress={() => onSelect(option)}
          className={cn(
            'flex-row items-center justify-between gap-3 px-4 py-4',
            index > 0 && 'border-t border-details-primary',
            isSelected && 'bg-details-primary',
          )}
        >
          <Text
            className="flex-1 text-[15px] text-label-primary"
            numberOfLines={2}
          >
            {option.name}
          </Text>
          <Text className="text-[15px] text-label-primary">
            {formatPrice(option)}
          </Text>
        </Pressable>
      );
    });
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end bg-background-shade"
        accessibilityLabel={closeLabel}
        onPress={onClose}
      >
        <Pressable
          className="gap-5 rounded-t-3xl bg-background-modal px-5 pb-8 pt-4"
          onPress={event => event.stopPropagation()}
        >
          <View className="h-1 w-10 self-center rounded-full bg-details-primary" />

          <Text className="text-xl font-bold text-label-primary">{title}</Text>

          <View className="h-px bg-details-primary" />

          <View className="gap-2">
            <Text className="text-xs font-semibold text-label-primary">
              {materialLabel}
            </Text>

            <View className="flex-row items-center gap-2 rounded-xl border border-details-primary bg-white px-4 py-3">
              <Icon as={Search} size={16} className="text-label-tertiary" />
              <TextInput
                value={term}
                onChangeText={onTermChange}
                placeholder={searchPlaceholder}
                placeholderTextColor={LabelTertiary}
                selectionColor={LabelPrimary}
                autoCorrect={false}
                className="flex-1 text-[15px] text-label-primary"
              />
            </View>

            <View className="max-h-80 overflow-hidden rounded-2xl bg-white shadow-md shadow-black/10">
              <ScrollView keyboardShouldPersistTaps="handled">
                {renderList()}
              </ScrollView>
            </View>
          </View>

          <View className="gap-2">
            <Text className="text-xs font-semibold text-label-primary">
              {quantityLabel}
            </Text>
            <TextInput
              value={quantity}
              onChangeText={onQuantityChange}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={LabelTertiary}
              selectionColor={LabelPrimary}
              className={cn(
                'rounded-xl border bg-white px-4 py-3 text-[15px] text-label-primary',
                isOverBalance
                  ? 'border-alert-primary'
                  : 'border-details-primary',
              )}
            />
            {/* O aviso compara com o saldo do item escolhido: sem escolha não
                há com o que comparar. */}
            {selected && isOverBalance && (
              <Text className="text-xs text-alert-primary">
                {overBalanceMessage}
              </Text>
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            onPress={onConfirm}
            className={cn(
              'flex-row items-center justify-center gap-2 rounded-full bg-button-primary py-4',
              !canSubmit && 'opacity-50',
            )}
          >
            <Icon as={Check} size={16} className="text-white" />
            <Text className="text-base font-semibold text-white">
              {confirmLabel}
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export { SupplySelectorSheet, type SupplySelectorSheetProps };
