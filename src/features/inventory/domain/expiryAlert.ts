/** O CA6 da US11 pede aviso 7 dias antes da data de validade. */
export const EXPIRY_ALERT_WINDOW_DAYS = 7;

/**
 * Data de validade no formato ISO `AAAA-MM-DD`.
 *
 * O tipo template literal existe para barrar em tempo de compilação o formato
 * de tela (`DD/MM/AAAA`, a máscara do cadastro da US09): atribuir
 * `'15/09/2026'` aqui não compila. Quem vier do CRUD com uma `string` solta
 * tem que passar por `parseExpirationDate` antes.
 */
export type IsoDate = `${number}-${number}-${number}`;

export type ExpiringItem = {
  id: string;
  name: string;
  expirationDate: IsoDate;
};

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Converte `AAAA-MM-DD` em Date local, ou devolve `null` se a string não for
 * uma data real. Rejeita formato errado e também data inexistente (31/02),
 * conferindo se os componentes sobrevivem à ida e volta.
 *
 * Devolver `null` em vez de `Invalid Date` é o que evita o `NaN` silencioso:
 * uma data quebrada para de "simplesmente nunca alertar" e passa a ser um
 * caso que o chamador consegue detectar.
 */
export function parseExpirationDate(value: string): Date | null {
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match.map(Number);
  const parsed = new Date(year, month - 1, day);

  const isRealDate =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day;

  return isRealDate ? parsed : null;
}

export function isValidExpirationDate(value: string): boolean {
  return parseExpirationDate(value) !== null;
}

/** Dias inteiros entre hoje e a validade. `null` se a data for inválida. */
export function daysUntilExpiration(
  expirationDate: string,
  now: Date,
): number | null {
  const expiration = parseExpirationDate(expirationDate);

  if (!expiration) {
    return null;
  }

  return Math.round(
    (expiration.getTime() - startOfDay(now).getTime()) / 86400000,
  );
}

export function isExpiringSoon(
  item: ExpiringItem,
  now: Date,
  windowDays = EXPIRY_ALERT_WINDOW_DAYS,
): boolean {
  const remainingDays = daysUntilExpiration(item.expirationDate, now);

  if (remainingDays === null) {
    return false;
  }

  return remainingDays >= 0 && remainingDays <= windowDays;
}

export type ExpiryAlertsResult = {
  newAlerts: ExpiringItem[];
  notifiedIds: string[];
  /**
   * Itens cuja data não pôde ser lida. Separados do fluxo normal para que a
   * camada de cima possa reclamar em vez de engolir o problema.
   */
  invalidItems: ExpiringItem[];
};

export function calculateExpiryAlerts(
  items: readonly ExpiringItem[],
  alreadyNotifiedIds: readonly string[],
  now: Date,
  windowDays = EXPIRY_ALERT_WINDOW_DAYS,
): ExpiryAlertsResult {
  const invalidItems = items.filter(
    item => !isValidExpirationDate(item.expirationDate),
  );
  const expiringSoon = items.filter(item =>
    isExpiringSoon(item, now, windowDays),
  );
  const alreadyNotified = new Set(alreadyNotifiedIds);

  return {
    newAlerts: expiringSoon.filter(item => !alreadyNotified.has(item.id)),
    notifiedIds: expiringSoon.map(item => item.id),
    invalidItems,
  };
}
