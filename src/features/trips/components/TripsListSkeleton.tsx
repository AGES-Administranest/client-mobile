import { View } from 'react-native';

import { cn } from 'app/lib/utils';

const ROWS = 3;

function Bar({ className }: { className: string }) {
  return <View className={cn('rounded bg-details-primary', className)} />;
}

// The Figma loading state of the list: a day header and three rows made of
// bars, in the place and size of the real ones.
export function TripsListSkeleton({ label }: { label: string }) {
  return (
    <View accessible accessibilityLabel={label} className="gap-[18px]">
      <View className="px-1">
        <View className="h-2.5 w-[70px] rounded-md bg-border-primary/50" />
      </View>
      <View className="overflow-hidden rounded-[14px] bg-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1)]">
        {Array.from({ length: ROWS }, (_, index) => (
          <View
            key={index}
            className={cn(
              'h-[65.5px] flex-row items-center gap-3 px-4 py-[13px]',
              index < ROWS - 1 && 'border-b border-details-primary',
            )}
          >
            <View className="size-[34px] rounded-[10px] bg-details-primary" />
            <View className="min-w-0 flex-1 gap-1.5">
              <Bar className="h-3 w-[140px]" />
              <Bar className="h-2.5 w-[90px]" />
            </View>
            <Bar className="h-3 w-14" />
          </View>
        ))}
      </View>
    </View>
  );
}
