import { View } from 'react-native';

import { cn } from 'app/lib/utils';

type SkeletonProps = {
  className?: string;
};

function Skeleton({ className }: SkeletonProps) {
  return <View className={cn('rounded bg-details-primary', className)} />;
}

export { Skeleton };
export type { SkeletonProps };
