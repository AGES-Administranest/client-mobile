import type {
  ProcedureEstimate,
  ProcedureEstimateResponse,
} from './pricing.types';

export const MAX_PROCEDURE_MINUTES = 1440;

export type DurationValidationResult = {
  isValid: boolean;
  durationMinutes: number;
  error: string | null;
};

export function toDurationMinutes(hours: number, minutes: number): number {
  return Math.max(0, hours) * 60 + Math.max(0, minutes);
}

export function fromDurationMinutes(totalMinutes: number): {
  hours: number;
  minutes: number;
} {
  const safeMinutes = Math.max(0, totalMinutes);
  return {
    hours: Math.floor(safeMinutes / 60),
    minutes: safeMinutes % 60,
  };
}

export function validateDuration(
  hoursText: string,
  minutesText: string,
): DurationValidationResult {
  const trimmedHours = hoursText.trim();
  const trimmedMinutes = minutesText.trim();

  if (trimmedHours === '' && trimmedMinutes === '') {
    return {
      isValid: false,
      durationMinutes: 0,
      error: 'Informe a duração estimada',
    };
  }

  const integerRegex = /^\d+$/;
  if (trimmedHours !== '' && !integerRegex.test(trimmedHours)) {
    return {
      isValid: false,
      durationMinutes: 0,
      error: 'Digite apenas números inteiros para as horas',
    };
  }
  if (trimmedMinutes !== '' && !integerRegex.test(trimmedMinutes)) {
    return {
      isValid: false,
      durationMinutes: 0,
      error: 'Digite apenas números inteiros para os minutos',
    };
  }

  const hours = trimmedHours === '' ? 0 : Number.parseInt(trimmedHours, 10);
  const minutes =
    trimmedMinutes === '' ? 0 : Number.parseInt(trimmedMinutes, 10);

  if (minutes < 0 || minutes > 59) {
    return {
      isValid: false,
      durationMinutes: 0,
      error: 'Os minutos devem ser entre 0 e 59',
    };
  }

  const total = toDurationMinutes(hours, minutes);

  if (total <= 0) {
    return {
      isValid: false,
      durationMinutes: 0,
      error: 'A duração deve ser maior que zero',
    };
  }

  if (total > MAX_PROCEDURE_MINUTES) {
    return {
      isValid: false,
      durationMinutes: total,
      error: 'A duração máxima é de 24 horas (1440 minutos)',
    };
  }

  return {
    isValid: true,
    durationMinutes: total,
    error: null,
  };
}

export function formatDurationDisplay(durationMinutes: number): string {
  if (durationMinutes <= 0) {
    return '0min';
  }
  const { hours, minutes } = fromDurationMinutes(durationMinutes);
  if (hours === 0) {
    return `${minutes}min`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h${String(minutes).padStart(2, '0')}`;
}

export function formatLaborCalculation(
  durationMinutes: number,
  formattedHourlyRate: string,
): string {
  const duration = formatDurationDisplay(durationMinutes);
  return `${duration} × ${formattedHourlyRate}/h`;
}

export function calculateSupplyLineTotal(
  quantity: number,
  unitCost: number,
): number {
  return Math.round(quantity * unitCost * 100) / 100;
}

export function calculateSuppliesSubtotal(
  supplies: { quantity: number; unitCost: number }[],
): number {
  const sum = supplies.reduce(
    (acc, s) => acc + calculateSupplyLineTotal(s.quantity, s.unitCost),
    0,
  );
  return Math.round(sum * 100) / 100;
}

export function mapProcedureEstimate(
  dto: ProcedureEstimateResponse,
): ProcedureEstimate {
  return {
    minimumPrice: Number(dto.minimumPrice),
    breakEvenPrice: Number(dto.breakEvenPrice),
    hoursCost: Number(dto.hoursCost),
    tripCost: Number(dto.tripCost),
    suppliesCost: Number(dto.suppliesCost),
    hourlyRateUsed: Number(dto.hourlyRateUsed),
    minimumHourlyRateUsed: Number(dto.minimumHourlyRateUsed),
    tripEstimateAvailable: dto.tripEstimateAvailable,
    tripEstimateDays: dto.tripEstimateDays,
    suppliesWithoutCost: dto.suppliesWithoutCost ?? [],
    durationMinutes: dto.durationMinutes,
    month: dto.month,
    year: dto.year,
  };
}
