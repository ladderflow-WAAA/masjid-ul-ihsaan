import AsyncStorage from '@react-native-async-storage/async-storage';
import { MasjidSettings, PrayerSchedule, Announcement } from '../types';
import { UserPrayerPrefs, DEFAULT_PREFS } from './notificationPlan';

const KEYS = {
  SETTINGS: '@masjid_settings',
  SCHEDULE: '@prayer_schedule',
  ANNOUNCEMENTS: '@announcements',
  LAST_SYNCED_AT: '@last_synced_at',
  USER_PREFS: '@user_prayer_prefs',
  PUSH_TOKEN: '@device_push_token',
  PUSH_ENABLED: '@push_notifications_enabled',
  APP_LANGUAGE: '@app_language',
};

export async function getCachedSettings(): Promise<MasjidSettings | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function setCachedSettings(settings: MasjidSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

export async function getCachedSchedule(): Promise<PrayerSchedule[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SCHEDULE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function setCachedSchedule(schedule: PrayerSchedule[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.SCHEDULE, JSON.stringify(schedule));
}

export async function getCachedAnnouncements(): Promise<Announcement[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.ANNOUNCEMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function setCachedAnnouncements(announcements: Announcement[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.ANNOUNCEMENTS, JSON.stringify(announcements));
}

export async function getLastSyncedAt(): Promise<string | null> {
  return await AsyncStorage.getItem(KEYS.LAST_SYNCED_AT);
}

export async function setLastSyncedAt(timestampIso: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.LAST_SYNCED_AT, timestampIso);
}

export async function getUserPrayerPrefs(): Promise<UserPrayerPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.USER_PREFS);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      enabledPrayers: { ...DEFAULT_PREFS.enabledPrayers, ...(parsed.enabledPrayers || {}) },
      enabledOffsets: { ...DEFAULT_PREFS.enabledOffsets, ...(parsed.enabledOffsets || {}) },
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function setUserPrayerPrefs(prefs: UserPrayerPrefs): Promise<void> {
  await AsyncStorage.setItem(KEYS.USER_PREFS, JSON.stringify(prefs));
}

export async function getPushToken(): Promise<string | null> {
  return await AsyncStorage.getItem(KEYS.PUSH_TOKEN);
}

export async function setPushToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(KEYS.PUSH_TOKEN, token);
  } else {
    await AsyncStorage.removeItem(KEYS.PUSH_TOKEN);
  }
}

export async function isPushEnabled(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(KEYS.PUSH_ENABLED);
  return raw === null ? true : raw === 'true'; // Default enabled
}

export async function setPushEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.PUSH_ENABLED, String(enabled));
}

export async function getAppLanguage(): Promise<'en' | 'ta' | null> {
  const lang = await AsyncStorage.getItem(KEYS.APP_LANGUAGE);
  return lang === 'en' || lang === 'ta' ? lang : null;
}

export async function setAppLanguage(lang: 'en' | 'ta'): Promise<void> {
  await AsyncStorage.setItem(KEYS.APP_LANGUAGE, lang);
}
