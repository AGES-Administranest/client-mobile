import { useEffect, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelPlaceholder } from 'theme/colors';

const NAME_INPUT_STYLE = Platform.select({
  web: { resize: 'none' } as never,
  default: undefined,
});

type EditableInventoryItemCardProps = {
  name: string;
  subtitle?: string;
  quantity: number;
  namePlaceholder?: string;
  onChangeName: (name: string) => void;
  onChangeQuantity: (quantity: number) => void;
  warning?: string;
};

export function EditableInventoryItemCard({
  name,
  subtitle,
  quantity,
  namePlaceholder,
  onChangeName,
  onChangeQuantity,
  warning,
}: EditableInventoryItemCardProps) {
  const [quantityText, setQuantityText] = useState(() => String(quantity));

  useEffect(() => {
    setQuantityText(current =>
      Number(current === '' ? '0' : current) === quantity
        ? current
        : String(quantity),
    );
  }, [quantity]);
  const [nameHeight, setNameHeight] = useState<number | null>(null);

  const handleQuantityChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '');
    setQuantityText(digits);
    onChangeQuantity(digits === '' ? 0 : Number(digits));
  };

  return (
    <View
      style={styles.card}
      className={cn(
        'w-full flex-row items-start gap-3 rounded-[14px] bg-white p-4',
        warning && 'border-2 border-alert-primary',
      )}
    >
      <View className="flex-1">
        <TextInput
          value={name}
          onChangeText={onChangeName}
          placeholder={namePlaceholder}
          placeholderTextColor={LabelPlaceholder}
          multiline
          className="w-full p-0 text-sm font-semibold text-label-primary"
          onContentSizeChange={event =>
            setNameHeight(event.nativeEvent.contentSize.height)
          }
          style={[NAME_INPUT_STYLE, nameHeight ? { height: nameHeight } : null]}
        />
        {subtitle ? (
          <Text className="pt-0.5 text-xs text-label-tertiary">{subtitle}</Text>
        ) : null}
        {warning ? (
          <Text className="pt-0.5 text-xs text-button-secondary">
            {warning}
          </Text>
        ) : null}
      </View>

      <TextInput
        value={quantityText}
        onChangeText={handleQuantityChange}
        keyboardType="number-pad"
        selectTextOnFocus
        className="w-14 p-0 text-right text-lg font-bold text-label-primary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
});
