import { Plus } from 'lucide-react-native';

import { ActionButton } from 'app/components/ui';
import { Icon } from 'app/components/ui/icon';

type NewEntryButtonProps = {
  label: string;
  onPress: () => void;
};

export function NewEntryButton({ label, onPress }: NewEntryButtonProps) {
  return (
    <ActionButton
      testID="finance-new-entry-button"
      label={label}
      icon={<Icon as={Plus} size={16} />}
      onPress={onPress}
    />
  );
}
