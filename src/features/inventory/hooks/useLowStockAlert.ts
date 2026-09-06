import { useCallback, useEffect, useRef } from 'react';

import { TranslationKey } from 'shared/i18n';
import { scheduleNotification } from 'shared/services';

import { buildAlertMessage } from '../domain/alertMessage';
import { calculateAlerts, MonitoredItem } from '../domain/lowStockAlert';
import {
  loadNotifiedIds,
  saveNotifiedIds,
} from '../services/lowStockAlertRepository';

/**
 * Mesma assinatura do `t` do I18nProvider. Recebido por parâmetro em vez de
 * chamar `useTranslation` aqui, para manter a tela como único ponto que toca
 * no i18n — o padrão da feature de referência.
 */
type Translate = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

/**
 * Observa a lista de itens e dispara a notificação local quando algum entra
 * em estoque mínimo.
 *
 * Não busca nem guarda os itens: quem os possui (a tela de Estoque) passa a
 * lista já carregada. Assim este hook não depende do CRUD e continua valendo
 * quando os dados reais chegarem.
 */
export function useLowStockAlert(
  items: readonly MonitoredItem[],
  t: Translate,
): void {
  // `t` muda quando o idioma muda; guardar em ref evita re-disparar o efeito
  // a cada troca de locale.
  const translateRef = useRef(t);
  translateRef.current = t;

  // Ler o storage, decidir e gravar de volta não é atômico. Duas
  // movimentações seguidas (o caso normal de um atendimento que consome
  // vários materiais) começariam as duas lendo o estado antigo e o mesmo
  // item seria notificado duas vezes. A fila serializa os ciclos.
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const sync = useCallback((nextItems: readonly MonitoredItem[]) => {
    queueRef.current = queueRef.current.then(async () => {
      const alreadyNotifiedIds = await loadNotifiedIds();
      const { newAlerts, notifiedIds } = calculateAlerts(
        nextItems,
        alreadyNotifiedIds,
      );

      await saveNotifiedIds(notifiedIds);

      const message = buildAlertMessage(newAlerts);

      if (!message) {
        return;
      }

      await scheduleNotification({
        title: translateRef.current(message.titleKey, message.params),
        body: translateRef.current(message.bodyKey, message.params),
      });
    });

    return queueRef.current;
  }, []);

  // A identidade do array muda a cada render do dono da lista. Reagir a uma
  // assinatura de saldos evita reprocessar (e reler o storage) à toa.
  const signature = items
    .map(item => `${item.id}:${item.quantity}:${item.minimumStock}`)
    .join('|');

  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    sync(itemsRef.current);
  }, [signature, sync]);
}
