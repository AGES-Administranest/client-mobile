import { useCallback, useEffect, useRef, useState } from 'react';

import {
  activeAlertKeys,
  AlertTimestamps,
  buildInventoryNotifications,
  InventoryItem,
  InventoryNotification,
  reconcileAlertTimestamps,
  reconcileDismissedAlerts,
} from '../domain/inventoryNotifications';
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
  items: readonly InventoryItem[],
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

    return () => clearInterval(interval);
  }, [referenceDate]);

  const signature = items
    .map(
      item =>
        `${item.id}:${item.quantity}:${item.minimumStock}:${item.expirationDate}`,
    )
    .join('|');
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    let isMounted = true;

    const now = referenceDateRef.current ?? new Date();
    const active = activeAlertKeys(itemsRef.current, now);

    Promise.all([loadAlertTimestamps(), loadDismissedAlerts()]).then(
      async ([storedTimestamps, storedDismissed]) => {
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
        }

        await Promise.all([
          saveAlertTimestamps(reconciledTimestamps),
          saveDismissedAlerts(reconciledDismissed),
        ]);
      },
    );

    return () => {
      isMounted = false;
    };
  }, [signature]);

  // O updater do setState tem que ser puro: em StrictMode o React o executa
  // duas vezes, o que gravaria no storage duas vezes. Por isso a leitura sai
  // de um ref e a gravação acontece fora dele.
  const dismissedRef = useRef<string[]>([]);
  dismissedRef.current = dismissed;

  const dismiss = useCallback((key: string) => {
    if (dismissedRef.current.includes(key)) {
      return;
    }

    const next = [...dismissedRef.current, key];

    setDismissed(next);
    saveDismissedAlerts(next);
  }, []);

  return {
    notifications: buildInventoryNotifications(
      items,
      timestamps,
      referenceDate ?? new Date(nowTick),
      dismissed,
    ),
    dismiss,
  };
}
