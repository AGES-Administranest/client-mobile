import { View } from 'react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Text } from 'app/components/ui/text';

type ServiceInvoiceDetailField = {
  label: string;
  value: string;
};

type ServiceInvoiceDetailSheetProps = {
  visible: boolean;
  title: string;
  closeLabel: string;
  fields: ServiceInvoiceDetailField[];
  onClose: () => void;
};

export function ServiceInvoiceDetailSheet({
  visible,
  title,
  closeLabel,
  fields,
  onClose,
}: ServiceInvoiceDetailSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
    >
      {fields.map(field => (
        <View key={field.label} className="gap-1">
          <Text className="text-xs font-semibold uppercase text-label-primary">
            {field.label}
          </Text>
          <Text className="text-[15px] text-label-primary">{field.value}</Text>
        </View>
      ))}
    </BottomSheet>
  );
}
