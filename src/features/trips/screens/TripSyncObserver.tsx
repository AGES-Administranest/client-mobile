import { ConfirmSheet } from 'app/components/ui/confirm-sheet';

import { useTripSync } from '../hooks/useTripSync';

export function TripSyncObserver() {
  const { rejection, dismissRejection } = useTripSync();

  return (
    <ConfirmSheet
      visible={rejection !== null}
      title="Falha na sincronização"
      message="Não foi possível sincronizar um dos seus deslocamentos com o servidor. Verifique os dados e tente novamente."
      confirmLabel="Entendi"
      onConfirm={dismissRejection}
      onCancel={dismissRejection}
    />
  );
}
