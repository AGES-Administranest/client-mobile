import * as React from 'react';

import { useTranslation } from 'shared/i18n';

import type { ExpiringLot } from '../domain/expiryAlert';
import type { MonitoredItem } from '../domain/lowStockAlert';
import { useExpiryAlert } from '../hooks/useExpiryAlert';
import { useLowStockAlert } from '../hooks/useLowStockAlert';
import { deactivateInventoryAlerts } from '../services/deactivateInventoryAlerts';

export type InventoryAlertSnapshot =
  | { status: 'loading'; userId: string | null }
  | {
      status: 'ready';
      userId: string;
      items: readonly MonitoredItem[];
      lots: readonly ExpiringLot[];
    };

type Props = {
  snapshot: InventoryAlertSnapshot;
  referenceDate?: Date;
};

function ReadyObserver({
  snapshot,
  referenceDate,
}: Props & {
  snapshot: Extract<InventoryAlertSnapshot, { status: 'ready' }>;
}) {
  const { t } = useTranslation();
  useLowStockAlert(snapshot.userId, snapshot.items, t);
  useExpiryAlert(snapshot.userId, snapshot.lots, t, referenceDate);
  return null;
}

export function InventoryAlertObserver({ snapshot, referenceDate }: Props) {
  const previousUserId = React.useRef<string | null>(null);
  const currentUserId = snapshot.userId;

  React.useEffect(() => {
    const previous = previousUserId.current;
    if (previous && previous !== currentUserId) {
      deactivateInventoryAlerts(previous).catch(error => {
        console.warn('[InventoryAlertObserver] account cleanup failed', error);
      });
    }
    previousUserId.current = currentUserId;
  }, [currentUserId]);

  return snapshot.status === 'ready' ? (
    <ReadyObserver snapshot={snapshot} referenceDate={referenceDate} />
  ) : null;
}
