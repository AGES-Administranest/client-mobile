import { cancelNotification } from 'shared/services';

import {
  loadExpirySchedule,
  saveExpirySchedule,
} from './expiryScheduleRepository';

/** Cancela apenas os agendamentos pertencentes à conta que saiu. */
export async function deactivateInventoryAlerts(userId: string): Promise<void> {
  const schedule = await loadExpirySchedule(userId);
  const entries = Object.entries(schedule);
  const results = await Promise.allSettled(
    entries.map(([, notificationId]) => cancelNotification(notificationId)),
  );
  const failed = Object.fromEntries(
    entries.filter((_, index) => results[index].status === 'rejected'),
  );

  await saveExpirySchedule(userId, failed);
}
