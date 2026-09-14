import { TranslationKey } from 'shared/i18n';

import { ExpiringLot, formatExpirationDate } from './expiryAlert';

const MAX_ITEMS_IN_BODY = 3;

export type ExpiryAlertMessage = {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  params: Record<string, string | number>;
};

export function buildExpiryAlertMessage(
  alerts: readonly ExpiringLot[],
): ExpiryAlertMessage | null {
  if (alerts.length === 0) {
    return null;
  }

  if (alerts.length === 1) {
    const [item] = alerts;

    return {
      titleKey: 'inventory.expiryAlert.titleSingular',
      bodyKey: 'inventory.expiryAlert.bodySingular',
      // Formato do usuário, igual ao do card: a notificação do SO dizia
      // "vence em 2026-09-20" enquanto a lista dizia "20/09/2026".
      params: {
        name: item.name,
        expirationDate: formatExpirationDate(item.expirationDate),
      },
    };
  }

  const names = alerts.map(item => item.name);
  const visible = names.slice(0, MAX_ITEMS_IN_BODY);
  const remaining = names.length - visible.length;

  return {
    titleKey: 'inventory.expiryAlert.titlePlural',
    bodyKey:
      remaining > 0
        ? 'inventory.expiryAlert.bodyPluralTruncated'
        : 'inventory.expiryAlert.bodyPlural',
    params: { total: names.length, items: visible.join(', '), remaining },
  };
}
