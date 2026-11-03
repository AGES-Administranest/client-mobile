import { View } from 'react-native';

import { Skeleton } from 'app/components/ui/skeleton';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';

type StatCardProps = {
  label: string;
  value: string;
  detail?: string;
  loading?: boolean;
  className?: string;
};

function StatValue({ value, detail }: { value: string; detail?: string }) {
  const valueText = (
    <Text className="text-xl font-bold text-label-primary">{value}</Text>
  );

  if (!detail) {
    return valueText;
  }

  return (
    <View className="flex-row flex-wrap items-baseline gap-x-2">
      {valueText}
      <Text className="text-xs text-label-tertiary">{detail}</Text>
    </View>
  );
}

function StatCard({
  label,
  value,
  detail,
  loading = false,
  className,
}: StatCardProps) {
  return (
    <View
      className={cn(
        'flex-1 gap-1 rounded-2xl bg-white p-4 shadow-sm shadow-black/10',
        className,
      )}
    >
      <Text className="text-[11px] font-semibold uppercase tracking-wide text-label-primary">
        {label}
      </Text>
      {loading ? (
        <View className="flex-row items-center gap-2 py-1">
          <Skeleton className="h-5 w-[72px]" />
          {detail !== undefined ? <Skeleton className="h-2.5 w-24" /> : null}
        </View>
      ) : (
        <StatValue value={value} detail={detail} />
      )}
    </View>
  );
}

export { StatCard };
export type { StatCardProps };
