import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  buildNotificationPlan,
  PlannedNotification,
  UserPrayerPrefs,
} from './notificationPlan';
import { PrayerSchedule } from '../types';

// Set notification handler so notifications show when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Configure Android notification channels:
 * - "prayer-reminders" (HIGH, sound)
 * - "prayer-reminders-silent" (HIGH, silent)
 * - "announcements" (HIGH, sound)
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('prayer-reminders', {
    name: 'Prayer Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#064e3b',
  });

  await Notifications.setNotificationChannelAsync('prayer-reminders-silent', {
    name: 'Prayer Reminders (Silent)',
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
    enableVibrate: false,
    lightColor: '#064e3b',
  });

  await Notifications.setNotificationChannelAsync('announcements', {
    name: 'Masjid Announcements',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#b45309',
  });
}

/**
 * Request notification permissions and check exact alarm capability
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
}

/**
 * Idempotently cancel all scheduled notifications whose id starts with "prayer-"
 */
export async function cancelAllPrayerReminders(): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.identifier.startsWith('prayer-')) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (err) {
    console.warn('Failed to cancel existing prayer reminders:', err);
  }
}

/**
 * Synchronize and schedule the notification plan
 */
export async function reschedulePrayerReminders({
  schedule,
  prefs,
  timezone,
  language,
}: {
  schedule: PrayerSchedule[];
  prefs: UserPrayerPrefs;
  timezone: string;
  language: 'en' | 'ta';
}): Promise<number> {
  await setupNotificationChannels();

  const plan = buildNotificationPlan({
    schedule,
    prefs,
    now: new Date(),
    timezone: timezone || 'Asia/Kolkata',
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    language,
  });

  // Cancel prior prayer reminders
  await cancelAllPrayerReminders();

  let scheduledCount = 0;

  for (const item of plan) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: item.id,
        content: {
          title: item.title,
          body: item.body,
          sound: prefs.sound === 'silent' ? undefined : 'default',
          data: {
            id: item.id,
            channelId: item.channelId,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: item.fireAt,
          channelId: item.channelId,
        },
      });
      scheduledCount++;
    } catch (err) {
      console.warn(`Failed scheduling reminder ${item.id}:`, err);
    }
  }

  return scheduledCount;
}

/**
 * Developer tool: schedule a test reminder in 1 minute
 */
export async function scheduleTestReminder(language: 'en' | 'ta'): Promise<void> {
  await setupNotificationChannels();

  const fireAt = new Date(Date.now() + 60 * 1000);
  const title = language === 'ta' ? 'சோதனை நினைவூட்டல்' : 'Test Prayer Reminder';
  const body =
    language === 'ta'
      ? 'மஸ்ஜிதுல் இஹ்சான் நினைவூட்டல் சரியாக செயல்படுகிறது.'
      : 'Masjidul Ihsaan local prayer reminder test is working.';

  await Notifications.scheduleNotificationAsync({
    identifier: `test-reminder-${Date.now()}`,
    content: {
      title,
      body,
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
      channelId: 'prayer-reminders',
    },
  });
}

/**
 * Developer tool: list all pending scheduled notifications
 */
export async function getPendingNotificationsList(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}
