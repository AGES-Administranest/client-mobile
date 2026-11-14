import { useState } from 'react';

import { isRangeComplete, type CalendarRange } from 'shared/utils/calendar';

import {
  useReportAvailability,
  type ReportAvailabilityNotice,
} from './useReportAvailability';
import {
  reportPeriodFor,
  reportToday,
  validateReportPeriod,
  type ReportKind,
  type ReportPeriod,
  type ReportPeriodChoice,
  type ReportPeriodError,
} from '../domain/reportPeriod';

type UseReportsScreenOptions = {
  onGenerateReport?: (kind: ReportKind, period: ReportPeriod) => void;
};

export type ReportsScreenState = {
  choice: ReportPeriodChoice;
  selectChoice: (choice: ReportPeriodChoice) => void;
  range: CalendarRange;
  setRange: (range: CalendarRange) => void;
  maxDate: string;
  periodError: ReportPeriodError | null;
  notice: ReportAvailabilityNotice | null;
  isChecking: boolean;
  canGenerate: boolean;
  generate: (kind: ReportKind) => Promise<void>;
};

export function useReportsScreen({
  onGenerateReport,
}: UseReportsScreenOptions = {}): ReportsScreenState {
  const [choice, setChoice] = useState<ReportPeriodChoice>('currentMonth');
  const [customRange, setCustomRange] = useState<CalendarRange>({
    from: null,
    to: null,
  });
  const availability = useReportAvailability();

  // The shortcuts are worked out on every render, so "Mês atual" follows the
  // calendar even when the tab stays open across midnight or a month change.
  const now = new Date();
  const range =
    choice === 'custom' ? customRange : reportPeriodFor(choice, now);
  const periodError = validateReportPeriod(range);

  // A notice speaks of the period it was asked for; once the period changes it
  // would describe one that is no longer on screen.
  const selectChoice = (next: ReportPeriodChoice) => {
    availability.dismissNotice();
    // "Personalizado" starts from the period that was showing, so the calendar
    // opens on it instead of empty.
    if (next === 'custom' && choice !== 'custom') {
      setCustomRange(range);
    }
    setChoice(next);
  };

  const setRange = (next: CalendarRange) => {
    availability.dismissNotice();
    setCustomRange(next);
  };

  const generate = async (kind: ReportKind) => {
    if (
      range.from === null ||
      range.to === null ||
      periodError !== null ||
      !onGenerateReport
    ) {
      return;
    }

    const period = { from: range.from, to: range.to };
    if (await availability.ensureRecords(period)) {
      onGenerateReport(kind, period);
    }
  };

  return {
    choice,
    selectChoice,
    range,
    setRange,
    maxDate: reportToday(now),
    periodError,
    notice: availability.notice,
    isChecking: availability.isChecking,
    canGenerate:
      isRangeComplete(range) &&
      periodError === null &&
      !availability.isChecking &&
      Boolean(onGenerateReport),
    generate,
  };
}
