import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { ExpiringLot } from '../domain/expiryAlert';
import {
  activeAlertKeys,
  AlertTimestamps,
  buildInventoryNotifications,
  InventoryNotification,
  reconcileAlertTimestamps,
  reconcileDismissedAlerts,
} from '../domain/inventoryNotifications';
import type { MonitoredItem } from '../domain/lowStockAlert';
import {
  loadAlertTimestamps,
  saveAlertTimestamps,
} from '../services/alertTimestampsRepository';
import {
  loadDismissedAlerts,
  saveDismissedAlerts,
} from '../services/dismissedAlertsRepository';

type InventoryNotificationsState = {
  notifications: InventoryNotification[];
  /** Apaga um alerta da lista. Volta se o item sair e reentrar em alerta. */
  dismiss: (key: string) => void;
};

/**
 * Monta a lista de alertas que a tela mostra.
 *
 * Repare na diferença para os hooks de notificação do SO: lá o objetivo é
 * *avisar uma vez*, agrupando itens numa mensagem só. Aqui é *listar*, então
 * cada lote aparece no seu próprio card, e um item que está abaixo do mínimo
 * e perto de vencer ao mesmo tempo gera dois cards.
 */
export function useInventoryNotifications(
  userId: string,
  items: readonly MonitoredItem[],
  lots: readonly ExpiringLot[],
  referenceDate?: Date,
  /**
   * Carimbos iniciais. Existe para demonstração e teste — a tela real não
   * passa nada aqui e deixa o repositório carimbar sozinho.
   */
  seedTimestamps?: AlertTimestamps,
): InventoryNotificationsState {
  const [timestamps, setTimestamps] = useState<AlertTimestamps>(
    seedTimestamps ?? {},
  );
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [loadedUserId, setLoadedUserId] = useState(userId);

  // O "há X min" é calculado no render, então sem um pulso ele congela: a tela
  // ficaria dizendo "há 10 min" indefinidamente. Um tique por minuto também
  // faz um item que entra na janela de validade com a tela aberta aparecer.
  const [nowTick, setNowTick] = useState(() => Date.now());

  const seedRef = useRef(seedTimestamps);
  seedRef.current = seedTimestamps;

  const referenceDateRef = useRef(referenceDate);
  referenceDateRef.current = referenceDate;

  useEffect(() => {
    // Com data de referência fixa (demonstração e teste) o relógio não anda.
    if (referenceDate) {
      return undefined;
    }

    const interval = setInterval(() => setNowTick(Date.now()), 60000);

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setNowTick(Date.now());
      }
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [referenceDate]);

  const signature = items
    .map(item => `${item.id}:${item.quantity}:${item.minimumStock}`)
    .join('|');
  const lotsSignature = lots
    .map(lot => `${lot.id}:${lot.itemId}:${lot.expirationDate}`)
    .join('|');
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const lotsRef = useRef(lots);
  lotsRef.current = lots;

  const activeSignature = activeAlertKeys(
    items,
    lots,
    referenceDate ?? new Date(nowTick),
  ).join('|');

  useEffect(() => {
    let isMounted = true;

    const now = referenceDateRef.current ?? new Date();
    const active = activeAlertKeys(itemsRef.current, lotsRef.current, now);

    Promise.all([
      loadAlertTimestamps(userId),
      loadDismissedAlerts(userId),
    ]).then(async ([storedTimestamps, storedDismissed]) => {
      if (!isMounted) {
        return;
      }
      const reconciledTimestamps = reconcileAlertTimestamps(
        active,
        { ...storedTimestamps, ...seedRef.current },
        now.getTime(),
      );
      const reconciledDismissed = reconcileDismissedAlerts(
        active,
        storedDismissed,
      );

      if (isMounted) {
        setTimestamps(reconciledTimestamps);
        setDismissed(reconciledDismissed);
        setLoadedUserId(userId);
      }

      await Promise.all([
        saveAlertTimestamps(userId, reconciledTimestamps),
        saveDismissedAlerts(userId, reconciledDismissed),
      ]);
    });

    return () => {
      isMounted = false;
    };
  }, [userId, signature, lotsSignature, activeSignature]);

  // O updater do setState tem que ser puro: em StrictMode o React o executa
  // duas vezes, o que gravaria no storage duas vezes. Por isso a leitura sai
  // de um ref e a gravação acontece fora dele.
  const dismissedRef = useRef<string[]>([]);
  dismissedRef.current = dismissed;

  const dismiss = useCallback(
    (key: string) => {
      if (dismissedRef.current.includes(key)) {
        return;
      }

      const next = [...dismissedRef.current, key];

      dismissedRef.current = next;
      setDismissed(next);
      saveDismissedAlerts(userId, next);
    },
    [userId],
  );

  return {
    notifications:
      loadedUserId === userId
        ? buildInventoryNotifications(
            items,
            lots,
            timestamps,
            referenceDate ?? new Date(nowTick),
            dismissed,
          )
        : [],
    dismiss,
  };
}
