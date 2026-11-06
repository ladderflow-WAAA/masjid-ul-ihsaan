import { fromZonedTime } from 'date-fns-tz';
import { PrayerSchedule } from '../types';

export type PrayerName = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type NotificationOffsetMinutes = 30 | 15 | 5 | 0;

export interface UserPrayerPrefs {
  enabledPrayers: Record<PrayerName, boolean>;
  enabledOffsets: Record<NotificationOffsetMinutes, boolean>;
  sound: 'default' | 'silent';
  timeFormat: '12h' | '24h';
}

export interface BuildNotificationPlanParams {
  schedule: PrayerSchedule[];
  prefs: UserPrayerPrefs;
  now: Date;
  timezone: string;
  platform: 'android' | 'ios';
  language: 'en' | 'ta';
}

export interface PlannedNotification {
  id: string;
  fireAt: Date;
  title: string;
  body: string;
  channelId: 'prayer-reminders' | 'prayer-reminders-silent';
}

export const DEFAULT_PREFS: UserPrayerPrefs = {
  enabledPrayers: {
    fajr: true,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
  },
  enabledOffsets: {
    30: true,
    15: true,
    5: false,
    0: false,
  },
  sound: 'default',
  timeFormat: '12h',
};

const PRAYER_LABELS: Record<PrayerName, { en: string; ta: string }> = {
  fajr: { en: 'Fajr', ta: 'ஃபஜ்ர்' },
  dhuhr: { en: 'Dhuhr', ta: 'ளுஹர்' },
  asr: { en: 'Asr', ta: 'அஸர்' },
  maghrib: { en: 'Maghrib', ta: 'மஃரிப்' },
  isha: { en: 'Isha', ta: 'இஷா' },
};

const JUMUAH_LABELS = {
  en: "Jumu'ah",
  ta: 'ஜும்ஆ',
};

/**
 * Format HH:mm:ss or HH:mm string to 12h or 24h display
 */
export function formatTimeDisplay(timeStr: string, format: '12h' | '24h'): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10);
  const minutes = parts[1] || '00';

  if (isNaN(hours)) return timeStr;

  if (format === '24h') {
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
}

/**
 * Pure function: buildNotificationPlan
 * Given prayer schedule, preferences, current time instant, and masjid timezone,
 * generates a deterministic, sorted list of notifications to schedule.
 */
export function buildNotificationPlan({
  schedule,
  prefs,
  now,
  timezone,
  platform,
  language,
}: BuildNotificationPlanParams): PlannedNotification[] {
  if (!schedule || schedule.length === 0) {
    return [];
  }

  const planned: PlannedNotification[] = [];
  const channelId = prefs.sound === 'silent' ? 'prayer-reminders-silent' : 'prayer-reminders';

  // Calculate cutoff for the 14-day scheduling window
  const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
  const maxHorizonMs = now.getTime() + fourteenDaysMs;

  const prayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const offsets: NotificationOffsetMinutes[] = [30, 15, 5, 0];

  for (const row of schedule) {
    if (!row.date) continue;

    // Determine if date is a Friday
    // date is YYYY-MM-DD
    const [y, m, d] = row.date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const isFriday = dateObj.getUTCDay() === 5;

    for (const prayer of prayers) {
      if (!prefs.enabledPrayers[prayer]) {
        continue;
      }

      // Determine Iqamah time and label (Handling Friday Dhuhr -> Jumu'ah swap)
      let iqamahTime: string;
      let prayerLabel = PRAYER_LABELS[prayer][language];

      if (prayer === 'dhuhr' && isFriday && row.jummah_iqamah) {
        iqamahTime = row.jummah_iqamah;
        prayerLabel = JUMUAH_LABELS[language];
      } else {
        const key = `${prayer}_iqamah` as keyof PrayerSchedule;
        iqamahTime = (row[key] as string) || '';
      }

      if (!iqamahTime) continue;

      // Ensure time string has HH:mm:ss format
      const normalizedTime = iqamahTime.length === 5 ? `${iqamahTime}:00` : iqamahTime;

      // Wall-clock string in masjid timezone
      const wallClockString = `${row.date} ${normalizedTime}`;

      // Convert masjid-local wall-clock time to absolute Date instant using masjid timezone
      let iqamahInstant: Date;
      try {
        iqamahInstant = fromZonedTime(wallClockString, timezone);
      } catch (err) {
        // Fallback for unexpected date formatting
        continue;
      }

      if (isNaN(iqamahInstant.getTime())) continue;

      // Build reminders for all active offsets
      for (const offset of offsets) {
        if (!prefs.enabledOffsets[offset]) {
          continue;
        }

        const fireAtTime = iqamahInstant.getTime() - offset * 60 * 1000;

        // Rule: Skip anything already in the past
        if (fireAtTime <= now.getTime()) {
          continue;
        }

        // Rule: Enforce 14-day horizon
        if (fireAtTime > maxHorizonMs) {
          continue;
        }

        const fireAt = new Date(fireAtTime);
        const formattedIqamah = formatTimeDisplay(normalizedTime, prefs.timeFormat);

        let title: string;
        let body: string;

        if (language === 'ta') {
          if (offset === 0) {
            title = `${prayerLabel} இகாமத் தொழுகை நேரம்`;
            body = `மஸ்ஜிதுல் இஹ்சானில் ${prayerLabel} இகாமத் நேரம் ${formattedIqamah}.`;
          } else {
            title = `${prayerLabel} இகாமத்திற்கு இன்னும் ${offset} நிமிடங்கள்`;
            body = `இகாமத் நேரம்: ${formattedIqamah} (இன்னும் ${offset} நிமிடங்கள் உள்ளன).`;
          }
        } else {
          if (offset === 0) {
            title = `${prayerLabel} Iqamah Now`;
            body = `Iqamah for ${prayerLabel} is at ${formattedIqamah} at Masjidul Ihsaan.`;
          } else {
            title = `${prayerLabel} Iqamah in ${offset} mins`;
            body = `Iqamah is scheduled for ${formattedIqamah} (${offset} minutes remaining).`;
          }
        }

        planned.push({
          id: `prayer-${row.date}-${prayer}-${offset}`,
          fireAt,
          title,
          body,
          channelId,
        });
      }
    }
  }

  // Sort chronologically
  planned.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());

  // Rule: Android max 400, iOS rolling cap 60
  if (platform === 'ios') {
    return planned.slice(0, 60);
  }

  return planned.slice(0, 400);
}
