import {
  EXPIRY_ALERT_WINDOW_DAYS,
  ExpiringItem,
  isValidExpirationDate,
  parseExpirationDate,
} from './expiryAlert';

/** Horário civil do disparo. Meia-noite acordaria o usuário de madrugada. */
export const EXPIRY_NOTIFICATION_HOUR = 9;

/**
 * O iOS mantém no máximo 64 notificações locais pendentes por app e descarta
 * o excedente **em silêncio**. Agendamos as datas mais próximas e deixamos
 * folga para as notificações imediatas de estoque mínimo.
 */
export const MAX_SCHEDULED_DATES = 48;

export type ScheduleEntry = {
  /**
   * Identidade do agendamento: data de vencimento + quais itens vencem nela.
   * Incluir os ids faz com que qualquer mudança de conteúdo gere uma chave
   * nova — o diff cancela a antiga e agenda a nova sem lógica extra.
   */
  key: string;
  fireAt: Date;
  items: ExpiringItem[];
};

export type SchedulePlan = {
  /** Agendamentos que ainda não existem e precisam ser criados. */
  toSchedule: ScheduleEntry[];
  /** Chaves já agendadas que deixaram de fazer sentido e devem ser canceladas. */
  toCancel: string[];
  /** Itens com data ilegível, para a camada de cima reclamar. */
  invalidItems: ExpiringItem[];
};

function buildKey(
  expirationDate: string,
  items: readonly ExpiringItem[],
): string {
  const ids = items.map(item => item.id).sort();

  return `${expirationDate}#${ids.join('+')}`;
}

/**
 * Instante em que a notificação deve tocar: `windowDays` antes do vencimento,
 * no horário civil.
 */
function notificationInstant(
  expiration: Date,
  windowDays: number,
  hour: number,
): Date {
  const fireAt = new Date(expiration);
  fireAt.setDate(fireAt.getDate() - windowDays);
  fireAt.setHours(hour, 0, 0, 0);

  return fireAt;
}

/**
 * Decide o que precisa estar agendado e compara com o que já está.
 *
 * Diferente da abordagem reativa anterior, aqui não perguntamos "algum item
 * entrou na janela agora?" — entregamos a data futura para o SO e ele acorda
 * sozinho, mesmo com o app fechado.
 */
export function planExpirySchedule(
  items: readonly ExpiringItem[],
  scheduledKeys: readonly string[],
  now: Date,
  windowDays = EXPIRY_ALERT_WINDOW_DAYS,
  hour = EXPIRY_NOTIFICATION_HOUR,
): SchedulePlan {
  const invalidItems = items.filter(
    item => !isValidExpirationDate(item.expirationDate),
  );

  const byDate = new Map<string, ExpiringItem[]>();

  for (const item of items) {
    const expiration = parseExpirationDate(item.expirationDate);

    if (!expiration) {
      continue;
    }

    // Item já vencido não tem aviso prévio a dar.
    if (expiration.getTime() < new Date(now).setHours(0, 0, 0, 0)) {
      continue;
    }

    const group = byDate.get(item.expirationDate) ?? [];
    group.push(item);
    byDate.set(item.expirationDate, group);
  }

  const planned = [...byDate.entries()]
    .map(([expirationDate, group]) => {
      const expiration = parseExpirationDate(expirationDate) as Date;
      const instant = notificationInstant(expiration, windowDays, hour);

      // Item cadastrado quando já falta menos que a janela: o instante ideal
      // ficou no passado, então avisa assim que der em vez de perder o aviso.
      const fireAt =
        instant.getTime() <= now.getTime()
          ? new Date(now.getTime() + 1000)
          : instant;

      return { key: buildKey(expirationDate, group), fireAt, items: group };
    })
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
    .slice(0, MAX_SCHEDULED_DATES);

  const plannedKeys = new Set(planned.map(entry => entry.key));
  const alreadyScheduled = new Set(scheduledKeys);

  return {
    toSchedule: planned.filter(entry => !alreadyScheduled.has(entry.key)),
    toCancel: scheduledKeys.filter(key => !plannedKeys.has(key)),
    invalidItems,
  };
}
