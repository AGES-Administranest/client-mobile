import {
  combineDateAndTime,
  isValidCalendarDate,
  isValidTimeOfDay,
  parseMaskedDate,
  parseMaskedTime,
} from './parseProcedureDateTime';
import type { FieldErrorCode } from './procedure.types';

// Remarcar um não realizado: o mesmo agendamento ganha data e horário novos.
export type RescheduleValues = {
  date: string;
  startTime: string;
  endTime: string;
};

export type RescheduleField = keyof RescheduleValues;

export type RescheduleErrors = Partial<Record<RescheduleField, FieldErrorCode>>;

const DEFAULT_DURATION_MS = 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, '0');
const toDateInput = (date: Date) =>
  `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
const toTimeInput = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

// Ponto de partida do formulário: o dia seguinte, no mesmo horário e com a
// mesma duração (uma hora quando o agendamento não tem fim salvo).
export function suggestReschedule(
  startsAt: string,
  endsAt: string | null,
): RescheduleValues {
  const start = new Date(startsAt);
  const duration = endsAt
    ? new Date(endsAt).getTime() - start.getTime()
    : DEFAULT_DURATION_MS;
  const nextStart = new Date(start);
  nextStart.setDate(start.getDate() + 1);
  const nextEnd = new Date(nextStart.getTime() + duration);

  return {
    date: toDateInput(nextStart),
    startTime: toTimeInput(nextStart),
    endTime: toTimeInput(nextEnd),
  };
}

export function validateReschedule(
  values: RescheduleValues,
  now: Date,
): RescheduleErrors {
  const errors: RescheduleErrors = {};

  const date = parseMaskedDate(values.date);
  if (values.date.trim() === '') {
    errors.date = 'REQUIRED';
  } else if (!date || !isValidCalendarDate(date.day, date.month, date.year)) {
    errors.date = 'INVALID_DATE';
  }

  const start = parseMaskedTime(values.startTime);
  if (values.startTime.trim() === '') {
    errors.startTime = 'REQUIRED';
  } else if (!start || !isValidTimeOfDay(start.hours, start.minutes)) {
    errors.startTime = 'INVALID_TIME';
  }

  const end = parseMaskedTime(values.endTime);
  if (values.endTime.trim() === '') {
    errors.endTime = 'REQUIRED';
  } else if (!end || !isValidTimeOfDay(end.hours, end.minutes)) {
    errors.endTime = 'INVALID_TIME';
  } else if (
    start &&
    !errors.startTime &&
    end.hours * 60 + end.minutes <= start.hours * 60 + start.minutes
  ) {
    errors.endTime = 'END_BEFORE_START';
  }

  if (!errors.date && !errors.startTime) {
    const startsAt = combineDateAndTime(values.date, values.startTime);
    if (startsAt && startsAt.getTime() <= now.getTime()) {
      errors.date = 'IN_THE_PAST';
    }
  }

  return errors;
}

// Só chame depois de validateReschedule sem erros.
export function toReschedulePayload(values: RescheduleValues): {
  startsAt: string;
  endsAt: string;
} {
  return {
    startsAt: combineDateAndTime(values.date, values.startTime)!.toISOString(),
    endsAt: combineDateAndTime(values.date, values.endTime)!.toISOString(),
  };
}
