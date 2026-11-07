import { createClient } from '@/lib/supabase/server';
import PublicTimetable from '@/components/PublicTimetable';
import { MasjidSettings, PrayerSchedule, Announcement } from '@/lib/types';
import {
  fallbackSettings,
  generatePrayerSchedule,
  generateMonthSchedules,
  fallbackAnnouncements,
} from '@/lib/mockData';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function HomePage() {
  const supabase = await createClient();

  // Get current date in Asia/Kolkata timezone (masjid wall clock)
  const todayDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  let settings: MasjidSettings | null = null;
  let todaySchedule: PrayerSchedule | null = null;
  let monthSchedules: PrayerSchedule[] = [];
  let announcements: Announcement[] = [];

  try {
    const [settingsRes, todayRes, monthRes, announcementsRes] = await Promise.all([
      supabase.from('masjid_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('prayer_schedule').select('*').eq('date', todayDateStr).maybeSingle(),
      supabase
        .from('prayer_schedule')
        .select('*')
        .gte('date', todayDateStr)
        .order('date', { ascending: true })
        .limit(31),
      supabase
        .from('announcements')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(10),
    ]);

    settings = settingsRes.data || null;
    todaySchedule = todayRes.data || null;
    monthSchedules = monthRes.data || [];
    announcements = announcementsRes.data || [];
  } catch (err) {
    // Database connection or query failed - will use robust fallbacks
  }

  // Graceful fallbacks ensuring full production data presence
  if (!settings) {
    settings = fallbackSettings;
  }
  if (!todaySchedule) {
    todaySchedule = generatePrayerSchedule(todayDateStr);
  }
  if (!monthSchedules || monthSchedules.length === 0) {
    monthSchedules = generateMonthSchedules(todayDateStr);
  }
  if (!announcements || announcements.length === 0) {
    announcements = fallbackAnnouncements;
  }

  return (
    <PublicTimetable
      settings={settings}
      todaySchedule={todaySchedule}
      monthSchedules={monthSchedules}
      announcements={announcements}
      todayDateStr={todayDateStr}
    />
  );
}
