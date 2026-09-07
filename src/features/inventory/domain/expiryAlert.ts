export const EXPIRY_ALERT_WINDOW_DAYS = 30;

export type ExpiringItem = {
  id: string;
  name: string;
  expirationDate: string;
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysUntil(date: string, now: Date): number {
  const expiration = startOfDay(new Date(`${date}T00:00:00`));
  const today = startOfDay(now);

  return Math.ceil((expiration.getTime() - today.getTime()) / 86400000);
}

export function isExpiringSoon(
  item: ExpiringItem,
  now: Date,
  windowDays = EXPIRY_ALERT_WINDOW_DAYS,
): boolean {
  const remainingDays = daysUntil(item.expirationDate, now);

  return remainingDays >= 0 && remainingDays <= windowDays;
}

export type ExpiryAlertsResult = {
  newAlerts: ExpiringItem[];
  notifiedIds: string[];
};

export function calculateExpiryAlerts(
  items: readonly ExpiringItem[],
  alreadyNotifiedIds: readonly string[],
  now: Date,
  windowDays = EXPIRY_ALERT_WINDOW_DAYS,
): ExpiryAlertsResult {
  const expiringSoon = items.filter(item =>
    isExpiringSoon(item, now, windowDays),
  );
  const alreadyNotified = new Set(alreadyNotifiedIds);

  return {
    newAlerts: expiringSoon.filter(item => !alreadyNotified.has(item.id)),
    notifiedIds: expiringSoon.map(item => item.id),
  };
}
