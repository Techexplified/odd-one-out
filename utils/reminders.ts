import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

/**
 * Daily streak reminder, delivered as a repeating local notification.
 *
 * In Expo Go on Android (SDK 53+), `expo-notifications` native modules
 * (`ExpoTopicSubscriptionModule`, `ExpoNotificationScheduler`) are not bundled,
 * and importing `expo-notifications` throws synchronously inside Metro's
 * module loader. We probe with `requireOptionalNativeModule` first so Expo Go
 * never imports `expo-notifications` and never crashes, while standalone APK/AAB
 * builds schedule real local notifications.
 */

const REMINDER_ID = 'daily-streak-reminder';
const CHANNEL_ID = 'streak-reminders';
export const REMINDER_HOUR = 20;
export const REMINDER_MINUTE = 0;

export const remindersSupported = Platform.OS !== 'web';

function hasNativeNotificationModules(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    const scheduler = requireOptionalNativeModule('ExpoNotificationScheduler');
    if (Platform.OS === 'android') {
      const topicMod = requireOptionalNativeModule('ExpoTopicSubscriptionModule');
      return Boolean(scheduler && topicMod);
    }
    return Boolean(scheduler);
  } catch {
    return false;
  }
}

async function loadNotifications() {
  if (!hasNativeNotificationModules()) return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

/**
 * Requests permission and schedules the reminder.
 * In Expo Go (where native notification modules are absent), returns `true`
 * so the in-app reminder toggle works smoothly without crashing.
 */
export async function enableDailyReminder(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const Notifications = await loadNotifications();
  if (!Notifications) {
    // Running in Expo Go without native notification module — persist in-app state cleanly
    return true;
  }
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Streak reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: "Don't lose your streak!",
        body: "Today's Odd One Out puzzle is waiting for you.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: REMINDER_HOUR,
        minute: REMINDER_MINUTE,
        channelId: CHANNEL_ID,
      },
    });
    return true;
  } catch (err) {
    console.warn('Could not schedule reminder:', err);
    return false;
  }
}

export async function disableDailyReminder(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
}
