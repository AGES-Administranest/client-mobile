export const DEFAULT_USEFUL_LIFE_YEARS = 10;
export const DEFAULT_USEFUL_LIFE_MONTHS = DEFAULT_USEFUL_LIFE_YEARS * 12;
const MONTHS_PER_YEAR = 12;
const CENTS_PER_UNIT = 100;

export type DepreciationPreviewInput = {
  purchaseValue: number | null;
  usefulLifeYears?: number | null;
  /** Meses exatos de quem não tem vida útil em anos inteiros; arredondar para anos faria a prévia divergir do card. */
  usefulLifeMonths?: number | null;
  /** AAAA-MM-DD. Ausente ou inválida: a checagem de fim de vida útil é pulada. */
  acquisitionDate?: string | null;
  salvageValue?: number;
  /** AAAA-MM-DD, o dia local de hoje. */
  today?: string;
};

export type DepreciationPreview = {
  monthlyDepreciation: number;
  lifeEnded: boolean;
};

type CalendarDay = { year: number; month: number; day: number };

function parseIsoDay(value: string | null | undefined): CalendarDay | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return null;
  const [year, month, day] = [match[1], match[2], match[3]].map(Number);
  const real = new Date(Date.UTC(year, month - 1, day));
  const isRealDay =
    real.getUTCFullYear() === year &&
    real.getUTCMonth() === month - 1 &&
    real.getUTCDate() === day;
  return isRealDay ? { year, month, day } : null;
}

function isLastDayOfMonth({ year, month, day }: CalendarDay): boolean {
  return day === new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Mesma regra do backend (equipment/domain/depreciation.ts, fullMonthsBetween):
// meses cheios, e o último dia do mês conta como mês completo.
function fullMonthsBetween(start: CalendarDay, end: CalendarDay): number {
  let months = (end.year - start.year) * 12 + end.month - start.month;
  if (end.day < start.day && !isLastDayOfMonth(end)) {
    months -= 1;
  }
  return Math.max(0, months);
}

function toCents(value: number): number {
  return Math.round(value * CENTS_PER_UNIT);
}

/**
 * A prévia tem que dar o mesmo número que o card mostra depois de salvar, então
 * espelha o `calculateDepreciation` do backend: depreciação linear sobre
 * (compra - residual), arredondada em centavos, e zero quando a vida útil
 * acabou.
 */
export function previewDepreciation({
  purchaseValue,
  usefulLifeYears,
  usefulLifeMonths,
  acquisitionDate,
  salvageValue = 0,
  today,
}: DepreciationPreviewInput): DepreciationPreview | null {
  if (
    purchaseValue === null ||
    !Number.isFinite(purchaseValue) ||
    purchaseValue <= 0
  ) {
    return null;
  }

  let lifeInMonths = DEFAULT_USEFUL_LIFE_MONTHS;
  if (usefulLifeMonths != null) {
    lifeInMonths = usefulLifeMonths;
  } else if (usefulLifeYears != null) {
    lifeInMonths = usefulLifeYears * MONTHS_PER_YEAR;
  }
  if (!Number.isInteger(lifeInMonths) || lifeInMonths <= 0) return null;

  const depreciableCents = toCents(purchaseValue) - toCents(salvageValue);
  if (depreciableCents <= 0) return null;

  const start = parseIsoDay(acquisitionDate);
  const end = parseIsoDay(today);
  const elapsedMonths = start && end ? fullMonthsBetween(start, end) : 0;
  const lifeEnded = elapsedMonths >= lifeInMonths;

  return {
    monthlyDepreciation: lifeEnded
      ? 0
      : Math.round(depreciableCents / lifeInMonths) / CENTS_PER_UNIT,
    lifeEnded,
  };
}
