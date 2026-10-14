import { Plus, Wrench } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { Button } from 'app/components/ui/button';
import { EmptyState } from 'app/components/ui/empty-state';
import { Text } from 'app/components/ui/text';

import { DepreciationSummaryCard } from './DepreciationSummaryCard';
import { EquipmentCard } from './EquipmentCard';
import type { Equipment } from '../domain/equipment.types';

export type EquipmentListItem = {
  equipment: Equipment;
  monthlyValue: string;
  monthlyUnitLabel: string;
  sinceLabel: string;
  progressPercent: number;
  progressLabel: string;
  endOfLifeLabel?: string;
};

type EquipmentListProps = {
  items: EquipmentListItem[];
  summary: { label: string; value: string; detail: string } | null;
  isLoading: boolean;
  errorMessage: string | null;
  loadingLabel: string;
  emptyMessage: string;
  retryLabel: string;
  addLabel: string;
  onRetry: () => void;
  onAddPress: () => void;
  onEquipmentPress: (equipment: Equipment) => void;
};

export function EquipmentList({
  items,
  summary,
  isLoading,
  errorMessage,
  loadingLabel,
  emptyMessage,
  retryLabel,
  addLabel,
  onRetry,
  onAddPress,
  onEquipmentPress,
}: EquipmentListProps) {
  const isInitialLoading = isLoading && items.length === 0 && !errorMessage;
  const isEmpty = !isLoading && !errorMessage && items.length === 0;

  return (
    <View className="flex-1 gap-4">
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow gap-3"
      >
        {isInitialLoading ? (
          <View className="flex-1 items-center justify-center">
            <Text variant="muted">{loadingLabel}</Text>
          </View>
        ) : null}
        {errorMessage ? (
          <View className="items-center gap-3 rounded-xl bg-destructive/10 px-4 py-3">
            <Text className="text-sm text-destructive">{errorMessage}</Text>
            <Button shape="pill" size="sm" onPress={onRetry}>
              <Text>{retryLabel}</Text>
            </Button>
          </View>
        ) : null}
        {isEmpty ? (
          <View className="flex-1 items-center justify-center">
            <EmptyState icon={Wrench} message={emptyMessage} />
          </View>
        ) : null}
        {summary && items.length > 0 ? (
          <DepreciationSummaryCard
            label={summary.label}
            value={summary.value}
            detail={summary.detail}
          />
        ) : null}
        {items.map(item => (
          <EquipmentCard
            key={item.equipment.id}
            name={item.equipment.name}
            monthlyValue={item.monthlyValue}
            monthlyUnitLabel={item.monthlyUnitLabel}
            sinceLabel={item.sinceLabel}
            progressPercent={item.progressPercent}
            progressLabel={item.progressLabel}
            endOfLifeLabel={item.endOfLifeLabel}
            onPress={() => onEquipmentPress(item.equipment)}
          />
        ))}
      </ScrollView>
      <Button
        shape="pill"
        icon={Plus}
        className="h-[49px] w-full mb-[16px]"
        onPress={onAddPress}
      >
        <Text>{addLabel}</Text>
      </Button>
    </View>
  );
}
