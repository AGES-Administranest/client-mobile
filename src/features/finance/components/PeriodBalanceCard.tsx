import { Card } from 'app/components/ui/card';
import { Text } from 'app/components/ui/text';
import { cn } from 'app/lib/utils';
import { MonthSelector } from 'shared/components/MonthSelector';

type PeriodBalanceCardProps = {
  monthLabel: string;
  currentMonthLabel: string | null;
  netBalanceLabel: string;
  netBalance: string;
  isNegative: boolean;
  previousMonthLabel: string;
  nextMonthLabel: string;
  notice?: string | null;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

export function PeriodBalanceCard({
  monthLabel,
  currentMonthLabel,
  netBalanceLabel,
  netBalance,
  isNegative,
  previousMonthLabel,
  nextMonthLabel,
  notice = null,
  onPreviousMonth,
  onNextMonth,
}: PeriodBalanceCardProps) {
  return (
    <Card className="gap-0 rounded-[14px] p-4">
      <MonthSelector
        label={monthLabel}
        caption={currentMonthLabel}
        previousLabel={previousMonthLabel}
        nextLabel={nextMonthLabel}
        onPrevious={onPreviousMonth}
        onNext={onNextMonth}
      />
      <Text className="pt-3 text-[11px] font-semibold uppercase tracking-[0.44px] text-label-primary">
        {netBalanceLabel}
      </Text>
      <Text
        className={cn(
          'pt-1 text-4xl font-bold tracking-tight',
          isNegative ? 'text-alert-primary' : 'text-label-primary',
        )}
      >
        {netBalance}
      </Text>
      {notice ? (
        <Text className="pt-1 text-[11px] text-label-tertiary">{notice}</Text>
      ) : null}
    </Card>
  );
}
