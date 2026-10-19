import { TranslationKey } from 'shared/i18n';

import { MonitoredItem } from './lowStockAlert';

/** Acima disso o corpo da notificação vira "... e mais N". */
const MAX_ITEMS_IN_BODY = 3;

/**
 * O domínio não traduz — devolve chaves e parâmetros. Quem tem acesso ao
 * `t()` (a tela, via hook) monta o texto final. Isso mantém a regra
 * framework-free e testável sem i18n.
 */
export type AlertMessage = {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  params: Record<string, string | number>;
};

export function buildAlertMessage(
  alerts: readonly MonitoredItem[],
): AlertMessage | null {
  if (alerts.length === 0) {
    return null;
  }

  if (alerts.length === 1) {
    const [item] = alerts;

    return {
      titleKey: 'inventory.alert.titleSingular',
      bodyKey: 'inventory.alert.bodySingular',
      params: {
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        minimum: item.minimumStock,
      },
    };
  }

  const names = alerts.map(item => item.name);
  const visible = names.slice(0, MAX_ITEMS_IN_BODY);
  const remaining = names.length - visible.length;

  return {
    titleKey: 'inventory.alert.titlePlural',
    bodyKey:
      remaining > 0
        ? 'inventory.alert.bodyPluralTruncated'
        : 'inventory.alert.bodyPlural',
    params: { total: names.length, items: visible.join(', '), remaining },
  };
}
