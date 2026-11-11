import { Check } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { BottomSheet } from 'app/components/ui/bottom-sheet';
import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type CategoryOption = { id: string; label: string };

type ReportCategoriesSheetProps = {
  visible: boolean;
  title: string;
  closeLabel: string;
  selectAllLabel: string;
  clearAllLabel: string;
  generateLabel: string;
  options: readonly CategoryOption[];
  selectedIds: readonly string[];
  isGenerating: boolean;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onGenerate: () => void;
  onClose: () => void;
};

export function ReportCategoriesSheet({
  visible,
  title,
  closeLabel,
  selectAllLabel,
  clearAllLabel,
  generateLabel,
  options,
  selectedIds,
  isGenerating,
  onToggle,
  onSelectAll,
  onClearAll,
  onGenerate,
  onClose,
}: ReportCategoriesSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      title={title}
      closeLabel={closeLabel}
      onClose={onClose}
      footer={
        <Button
          shape="pill"
          className="h-[49px] w-full"
          disabled={selectedIds.length === 0 || isGenerating}
          onPress={onGenerate}
        >
          <Text>{generateLabel}</Text>
        </Button>
      }
    >
      <View className="flex-row justify-between">
        <Pressable accessibilityRole="button" onPress={onSelectAll}>
          <Text className="text-sm font-medium text-label-primary">
            {selectAllLabel}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClearAll}>
          <Text className="text-sm font-medium text-label-tertiary">
            {clearAllLabel}
          </Text>
        </Pressable>
      </View>
      {options.map(option => {
        const isSelected = selectedIds.includes(option.id);

        return (
          <Pressable
            key={option.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            onPress={() => onToggle(option.id)}
            className="flex-row items-center gap-3 rounded-lg border border-border-primary bg-white px-3 py-3"
          >
            <View
              className={cn(
                'size-5 items-center justify-center rounded border border-border-primary',
                isSelected && 'border-primary bg-primary',
              )}
            >
              {isSelected ? (
                <Icon as={Check} size={14} className="text-white" />
              ) : null}
            </View>
            <Text className="text-sm text-label-primary">{option.label}</Text>
          </Pressable>
        );
      })}
    </BottomSheet>
  );
}
