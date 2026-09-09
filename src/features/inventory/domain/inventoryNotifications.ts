import { isExpiringSoon } from './expiryAlert';
import type { ExpiringItem, IsoDate } from './expiryAlert';
import { elapsedMinutesSince, formatElapsedTime } from './formatElapsedTime';
import type { ElapsedTime } from './formatElapsedTime';
import { isAtOrBelowMinimum } from './lowStockAlert';
import type { MonitoredItem } from './lowStockAlert';

/**
 * O item completo que a lista precisa: saldo, mínimo e validade juntos.
 * Continua estrutural — o tipo do CRUD (US09) satisfaz este por ter todos
 * esses campos, sem precisar de import cruzado.
 */
export type InventoryItem = MonitoredItem & ExpiringItem;

export type NotificationKind = 'lowStock' | 'expiry';

type BaseNotification = {
  /** Chave estável do alerta: dois alertas do mesmo item não colidem. */
  key: string;
  itemId: string;
  name: string;
  elapsed: ElapsedTime;
};

/**
 * União discriminada por `kind`: cada tipo de alerta carrega exatamente os
 * campos que usa. Com campos opcionais compartilhados a tela precisava de
 * `?? 0` e `?? ''`, que renderizariam "0 unidades restantes" caso o dado
 * viesse errado em vez de quebrar a compilação.
 */
export type InventoryNotification =
  | (BaseNotification & {
      kind: 'lowStock';
      quantity: number;
      minimumStock: number;
    })
  | (BaseNotification & { kind: 'expiry'; expirationDate: IsoDate });

/** Instante em que cada alerta apareceu, por chave. */
export type AlertTimestamps = Record<string, number>;

export function lowStockKey(itemId: string): string {
  return `lowStock:${itemId}`;
}

export function expiryKey(itemId: string): string {
  return `expiry:${itemId}`;
}

/**
 * Quais alertas estão ativos agora. Um mesmo item pode gerar os dois: um lote
 * pode estar abaixo do mínimo E perto de vencer, e o design pede um card para
 * cada situação.
 */
export function activeAlertKeys(
  items: readonly InventoryItem[],
  now: Date,
): string[] {
  const keys: string[] = [];

  for (const item of items) {
    if (isAtOrBelowMinimum(item)) {
      keys.push(lowStockKey(item.id));
    }

    if (isExpiringSoon(item, now)) {
      keys.push(expiryKey(item.id));
    }
  }

  return keys;
}

/**
 * Mantém o carimbo de tempo dos alertas que continuam ativos, carimba os que
 * acabaram de aparecer e descarta os que sumiram — assim o "há X min" conta
 * desde que o alerta surgiu, não desde que a tela abriu.
 */
export function reconcileAlertTimestamps(
  activeKeys: readonly string[],
  stored: AlertTimestamps,
  now: number,
): AlertTimestamps {
  const reconciled: AlertTimestamps = {};

  for (const key of activeKeys) {
    reconciled[key] = stored[key] ?? now;
  }

  return reconciled;
}

/**
 * Mantém dispensados apenas os alertas que continuam ativos.
 *
 * É o mesmo truque do conjunto de notificados: quando o item sai da situação
 * de alerta, a chave cai fora daqui sozinha — então se ele voltar a ficar
 * crítico depois, o card reaparece em vez de ficar apagado para sempre.
 */
export function reconcileDismissedAlerts(
  activeKeys: readonly string[],
  dismissed: readonly string[],
): string[] {
  const active = new Set(activeKeys);

  return dismissed.filter(key => active.has(key));
}

/**
 * Monta a lista que a tela desenha: um card por alerta, os dois tipos
 * misturados, do mais recente para o mais antigo. Alertas dispensados pelo
 * usuário ficam de fora.
 */
export function buildInventoryNotifications(
  items: readonly InventoryItem[],
  timestamps: AlertTimestamps,
  now: Date,
  dismissedKeys: readonly string[] = [],
): InventoryNotification[] {
  const dismissed = new Set(dismissedKeys);
  const nowMs = now.getTime();
  const notifications: InventoryNotification[] = [];

  for (const item of items) {
    if (isAtOrBelowMinimum(item)) {
      const key = lowStockKey(item.id);

      notifications.push({
        key,
        kind: 'lowStock',
        itemId: item.id,
        name: item.name,
        quantity: item.quantity,
        minimumStock: item.minimumStock,
        elapsed: formatElapsedTime(
          elapsedMinutesSince(timestamps[key] ?? nowMs, nowMs),
        ),
      });
    }

    if (isExpiringSoon(item, now)) {
      const key = expiryKey(item.id);

      notifications.push({
        key,
        kind: 'expiry',
        itemId: item.id,
        name: item.name,
        expirationDate: item.expirationDate,
        elapsed: formatElapsedTime(
          elapsedMinutesSince(timestamps[key] ?? nowMs, nowMs),
        ),
      });
    }
  }

  return notifications
    .filter(notification => !dismissed.has(notification.key))
    .sort(
      (a, b) => (timestamps[b.key] ?? nowMs) - (timestamps[a.key] ?? nowMs),
    );
}
