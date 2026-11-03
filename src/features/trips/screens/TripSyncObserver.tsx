import { ConfirmSheet } from 'app/components/ui/confirm-sheet';
import { useTranslation } from 'shared/i18n';

import { useTripSync } from '../hooks/useTripSync';

export function TripSyncObserver() {
  const { t } = useTranslation();
  const { rejection, dismissRejection } = useTripSync();

  return (
    <ConfirmSheet
      visible={rejection !== null}
      title={t('trips.sync.rejectedTitle')}
      message={t('trips.sync.rejectedMessage')}
      confirmLabel={t('trips.sync.rejectedConfirm')}
      onConfirm={dismissRejection}
      onCancel={dismissRejection}
    />
  );
}
