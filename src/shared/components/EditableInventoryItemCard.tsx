import { useEffect, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { LabelPlaceholder } from 'theme/colors';

// A multiline TextInput becomes a <textarea> on web, which draws a resize grip
// in its corner. Native platforms ignore this.
const NAME_INPUT_STYLE = Platform.select({
  web: { resize: 'none' } as never,
  default: undefined,
});

type EditableInventoryItemCardProps = {
  name: string;
  /** Secondary line, e.g. the unit and dosage read from the invoice. */
  subtitle?: string;
  quantity: number;
  namePlaceholder?: string;
  onChangeName: (name: string) => void;
  onChangeQuantity: (quantity: number) => void;
  /** Warning message; also highlights the card border in the alert color. */
  warning?: string;
};

// Editable twin of `InventoryItemCard`, used when the values come from
// extraction and the user needs to correct them before saving.
export function EditableInventoryItemCard({
  name,
  subtitle,
  quantity,
  namePlaceholder,
  onChangeName,
  onChangeQuantity,
  warning,
}: EditableInventoryItemCardProps) {
  // Local text state so the field can be emptied while typing; the parsed
  // number is pushed up on every keystroke.
  const [quantityText, setQuantityText] = useState(() => String(quantity));

  // Extracted items carry positional ids ("item-0"), so a second extraction can
  // hand this instance a different item under the same key. Comparing parsed
  // values leaves a field the user has just emptied alone.
  useEffect(() => {
    setQuantityText(current =>
      Number(current === '' ? '0' : current) === quantity
        ? current
        : String(quantity),
    );
  }, [quantity]);
  // Grows the name field with its content so a long item name is fully visible
  // for review instead of being clipped to the input's default height.
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
          // w-full: without it the multiline input keeps its intrinsic width on
          // web and wraps long item names after a few characters.
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
        // Fixed width: a bare <input> claims a ~217px intrinsic width on web,
        // which would starve the name column next to it.
        className="w-14 p-0 text-right text-lg font-bold text-label-primary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Drop shadow from Figma: 0px 5px 5px rgba(0,0,0,0.1).
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
});
