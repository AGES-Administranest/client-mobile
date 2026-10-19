// O dia é o do aparelho: [00:00, 23:59:59.999] no fuso local, enviado em ISO.
export function dayBounds(day: Date): { from: string; to: string } {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function shiftDays(day: Date, amount: number): Date {
  const next = new Date(day);
  next.setDate(next.getDate() + amount);
  return next;
}

export function byStartTime<T extends { startsAt: string }>(
  a: T,
  b: T,
): number {
  return a.startsAt.localeCompare(b.startsAt);
}
