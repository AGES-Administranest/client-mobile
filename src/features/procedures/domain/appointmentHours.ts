export type HoursWorked = {
  hours: number;
  minutes: number;
  /** null quando não há valor cobrado para dividir pelas horas. */
  valuePerHour: number | null;
};

export function calculateHoursWorked(
  startsAt: string,
  endsAt: string,
  amount: string | null,
): HoursWorked {
  const minutes = Math.max(
    0,
    (new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000,
  );
  const hours = minutes / 60;
  const billed = amount === null ? null : Number.parseFloat(amount);
  const valuePerHour =
    billed !== null && Number.isFinite(billed) && hours > 0
      ? billed / hours
      : null;

  return { hours, minutes, valuePerHour };
}
