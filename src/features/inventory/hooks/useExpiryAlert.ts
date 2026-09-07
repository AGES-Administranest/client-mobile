import { useCallback, useEffect, useRef } from 'react';

import { TranslationKey } from 'shared/i18n';
import { scheduleNotification } from 'shared/services';

import { calculateExpiryAlerts, ExpiringItem } from '../domain/expiryAlert';
import { buildExpiryAlertMessage } from '../domain/expiryAlertMessage';
import {
  loadExpiryNotifiedIds,
  saveExpiryNotifiedIds,
} from '../services/expiryAlertRepository';

type Translate = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

export function useExpiryAlert(
  items: readonly ExpiringItem[],
  t: Translate,
  referenceDate?: Date,
): void {
  const nowRef = useRef(referenceDate ?? new Date());
  const translateRef = useRef(t);
  translateRef.current = t;
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  const sync = useCallback((nextItems: readonly ExpiringItem[]) => {
    queueRef.current = queueRef.current.then(async () => {
      const alreadyNotifiedIds = await loadExpiryNotifiedIds();
      const { newAlerts, notifiedIds } = calculateExpiryAlerts(
        nextItems,
        alreadyNotifiedIds,
        nowRef.current,
      );

      await saveExpiryNotifiedIds(notifiedIds);

      const message = buildExpiryAlertMessage(newAlerts);

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

  const signature = items
    .map(item => `${item.id}:${item.expirationDate}`)
    .join('|');
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    sync(itemsRef.current);
  }, [signature, sync]);
}
