import { useCallback, useState } from 'react';

import type { CalendarRange } from 'shared/utils/calendar';

import {
  defaultReportPeriod,
  isReportPeriodReady,
} from '../domain/reportPeriod';

export type ReportsScreenState = {
  range: CalendarRange;
  setRange: (range: CalendarRange) => void;
  isCalendarOpen: boolean;
  toggleCalendar: () => void;
  canGenerate: boolean;
};

export function useReportsScreen(): ReportsScreenState {
  const [range, setRange] = useState<CalendarRange>(() =>
    defaultReportPeriod(new Date()),
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const toggleCalendar = useCallback(() => {
    setIsCalendarOpen(open => !open);
  }, []);

  return {
    range,
    setRange,
    isCalendarOpen,
    toggleCalendar,
    canGenerate: isReportPeriodReady(range),
  };
}
