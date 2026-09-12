import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { TranslationKey } from 'shared/i18n';
import { cancelNotification, scheduleNotificationAt } from 'shared/services';

import { ExpiringLot } from '../domain/expiryAlert';
import { buildExpiryAlertMessage } from '../domain/expiryAlertMessage';
import { planExpirySchedule } from '../domain/expirySchedule';
import {
  ExpirySchedule,
  loadExpirySchedule,
  saveExpirySchedule,
} from '../services/expiryScheduleRepository';

type Translate = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

/**
 * Mantém os avisos de validade agendados no sistema operacional.
 *
 * Ao contrário do alerta de estoque mínimo — que reage a uma ação do usuário
 * e dispara na hora —, a validade é um evento de calendário conhecido desde o
 * cadastro. Por isso aqui não se pergunta "algum item entrou na janela?": a
 * data futura é entregue ao SO, que acorda sozinho no dia certo mesmo com o
 * app fechado ou o aparelho reiniciado.
 *
 * Os itens são agrupados por data de vencimento: cinco lotes que vencem no
 * mesmo dia geram uma notificação, não cinco.
 */
export function useExpiryAlert(
  userId: string,
  items: readonly ExpiringLot[],
  t: Translate,
  referenceDate?: Date,
): void {
  const activeUserRef = useRef<string | null>(userId);
  useEffect(() => {
    activeUserRef.current = userId;
    return () => {
      if (activeUserRef.current === userId) {
        activeUserRef.current = null;
      }
    };
  }, [userId]);

  const translateRef = useRef(t);
  translateRef.current = t;

  const referenceDateRef = useRef(referenceDate);
  referenceDateRef.current = referenceDate;

  // Ler o mapa, agendar e gravar de volta não é atômico. A fila impede que
  // duas sincronizações concorrentes agendem a mesma data duas vezes.
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const sync = useCallback(
    (nextItems: readonly ExpiringLot[]) => {
      queueRef.current = queueRef.current
        .then(async () => {
          // Lido a cada ciclo, nunca congelado na montagem: o app pode ficar
          // aberto por dias e a data de referência precisa acompanhar.
          const now = referenceDateRef.current ?? new Date();

          const schedule = await loadExpirySchedule(userId);
          const { toSchedule, toCancel, invalidItems } = planExpirySchedule(
            nextItems,
            Object.keys(schedule),
            now,
          );

          // Data ilegível é erro de integração, não caso de negócio. Sem este
          // aviso o item simplesmente nunca alerta e ninguém descobre por quê.
          if (__DEV__ && invalidItems.length > 0) {
            console.warn(
              '[useExpiryAlert] datas de validade ilegíveis (esperado AAAA-MM-DD):',
              invalidItems.map(item => `${item.id}=${item.expirationDate}`),
            );
          }

          if (toSchedule.length === 0 && toCancel.length === 0) {
            return;
          }

          const next: ExpirySchedule = { ...schedule };

          for (const key of toCancel) {
            await cancelNotification(next[key]);
            delete next[key];
            await saveExpirySchedule(userId, next);
          }

          for (const entry of toSchedule) {
            if (activeUserRef.current !== userId) {
              return;
            }
            const message = buildExpiryAlertMessage(entry.items);

            if (!message) {
              continue;
            }

            const notificationId = await scheduleNotificationAt(
              {
                title: translateRef.current(message.titleKey, message.params),
                body: translateRef.current(message.bodyKey, message.params),
              },
              entry.fireAt,
            );

            // `null` no target web, onde não há notificação local: nada a guardar.
            if (notificationId) {
              if (activeUserRef.current !== userId) {
                await cancelNotification(notificationId);
                return;
              }
              next[entry.key] = notificationId;
              // Preserve cada sucesso mesmo se uma operação posterior falhar.
              await saveExpirySchedule(userId, next);
            }
          }
        })
        .catch(error => {
          console.warn(
            '[useExpiryAlert] notification sync failed; retry on next sync',
            error,
          );
        });

      return queueRef.current;
    },
    [userId],
  );

  const signature = items
    .map(item => `${item.id}:${item.expirationDate}`)
    .join('|');
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    sync(itemsRef.current);
  }, [signature, sync]);

  useEffect(() => {
    if (referenceDate) {
      return undefined;
    }

    let day = new Date().toDateString();
    const interval = setInterval(() => {
      const today = new Date().toDateString();
      if (today !== day) {
        day = today;
        sync(itemsRef.current);
      }
    }, 60000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        day = new Date().toDateString();
        sync(itemsRef.current);
      }
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [referenceDate, sync]);
}
