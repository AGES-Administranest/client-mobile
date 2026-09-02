import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// expo-notifications has no web implementation — every export below is a
// no-op there so the app still bundles and runs in the browser.
const isSupported = Platform.OS !== 'web';

if (isSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Android needs a channel before any notification can be shown; iOS and web
 * need nothing. Call once on app start.
 */
export async function initNotifications(): Promise<void> {
  if (!isSupported || Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Asks for permission if it wasn't granted yet. Required on iOS and Android 13+. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isSupported) {
    return false;
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

type ScheduleInput = {
  title: string;
  body?: string;
  /** `null` fires immediately; otherwise see `Notifications.SchedulableTriggerInputTypes`. */
  trigger?: Notifications.NotificationTriggerInput;
};

/** Returns the notification id (to cancel it later), or `null` if unavailable. */
export async function scheduleNotification({
  title,
  body,
  trigger = null,
}: ScheduleInput): Promise<string | null> {
  if (!isSupported || !(await requestNotificationPermission())) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger,
  });
}

export async function cancelNotification(id: string): Promise<void> {
  if (!isSupported) {
    return;
  }

  await Notifications.cancelScheduledNotificationAsync(id);
}
