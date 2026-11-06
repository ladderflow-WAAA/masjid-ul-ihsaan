import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { supabase } from './supabase';
import {
  getCachedSettings,
  setCachedSettings,
  getCachedSchedule,
  setCachedSchedule,
  getCachedAnnouncements,
  setCachedAnnouncements,
  getLastSyncedAt,
  setLastSyncedAt,
  getUserPrayerPrefs,
  getAppLanguage,
} from './storage';
import { reschedulePrayerReminders } from './notificationScheduler';
import { MasjidSettings, PrayerSchedule, Announcement } from '../types';

export const BACKGROUND_SYNC_TASK = 'MASJID_BACKGROUND_SYNC';
const THROTTLE_MS = 15 * 60 * 1000; // 15 minutes

export interface SyncResult {
  settings: MasjidSettings | null;
  schedule: PrayerSchedule[];
  announcements: Announcement[];
  synced: boolean;
  isOffline: boolean;
  lastSyncedAt: string | null;
}

/**
 * Format Date to YYYY-MM-DD
 */
function formatDateToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Perform offline-first sync
 */
export async function performSync(force = false): Promise<SyncResult> {
  const lastSyncStr = await getLastSyncedAt();
  const cachedSettings = await getCachedSettings();
  const cachedSchedule = await getCachedSchedule();
  const cachedAnnouncements = await getCachedAnnouncements();

  // Throttle non-forced syncs to once every 15 minutes
  if (!force && lastSyncStr) {
    const elapsed = Date.now() - new Date(lastSyncStr).getTime();
    if (elapsed < THROTTLE_MS && cachedSchedule.length > 0) {
      return {
        settings: cachedSettings,
        schedule: cachedSchedule,
        announcements: cachedAnnouncements,
        synced: false,
        isOffline: false,
        lastSyncedAt: lastSyncStr,
      };
    }
  }

  // Calculate yesterday and +45 days
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const plus45 = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

  const yesterdayStr = formatDateToYMD(yesterday);
  const plus45Str = formatDateToYMD(plus45);

  try {
    const [settingsRes, scheduleRes, announcementsRes] = await Promise.all([
      supabase.from('masjid_settings').select('*').eq('id', 1).maybeSingle(),
      supabase
        .from('prayer_schedule')
        .select('*')
        .gte('date', yesterdayStr)
        .lte('date', plus45Str)
        .order('date', { ascending: true }),
      supabase
        .from('announcements')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(50),
    ]);

    if (settingsRes.error) throw settingsRes.error;
    if (scheduleRes.error) throw scheduleRes.error;
    if (announcementsRes.error) throw announcementsRes.error;

    const freshSettings: MasjidSettings = settingsRes.data || cachedSettings;
    const freshSchedule: PrayerSchedule[] = scheduleRes.data || cachedSchedule;
    const freshAnnouncements: Announcement[] = announcementsRes.data || cachedAnnouncements;
    const nowIso = new Date().toISOString();

    // Cache locally in AsyncStorage
    if (freshSettings) await setCachedSettings(freshSettings);
    if (freshSchedule.length > 0) await setCachedSchedule(freshSchedule);
    await setCachedAnnouncements(freshAnnouncements);
    await setLastSyncedAt(nowIso);

    // Rebuild local notification plan
    const prefs = await getUserPrayerPrefs();
    const lang = (await getAppLanguage()) || 'en';
    await reschedulePrayerReminders({
      schedule: freshSchedule,
      prefs,
      timezone: freshSettings?.timezone || 'Asia/Kolkata',
      language: lang,
    });

    return {
      settings: freshSettings,
      schedule: freshSchedule,
      announcements: freshAnnouncements,
      synced: true,
      isOffline: false,
      lastSyncedAt: nowIso,
    };
  } catch (err) {
    // Network failed or offline: fall back cleanly to local cache
    console.warn('Sync failed, falling back to local cache:', err);
    return {
      settings: cachedSettings,
      schedule: cachedSchedule,
      announcements: cachedAnnouncements,
      synced: false,
      isOffline: true,
      lastSyncedAt: lastSyncStr,
    };
  }
}

/**
 * Register background sync task (~12h intervals)
 */
export async function registerBackgroundSyncTask(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(BACKGROUND_SYNC_TASK, {
        minimumInterval: 12 * 60 * 60, // 12 hours
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch (err) {
    console.warn('Failed to register background sync task:', err);
  }
}

// Define the background task handler
TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
  try {
    const res = await performSync(true);
    return res.synced
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});
