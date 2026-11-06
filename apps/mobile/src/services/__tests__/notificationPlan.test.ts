import {
  buildNotificationPlan,
  DEFAULT_PREFS,
  UserPrayerPrefs,
  formatTimeDisplay,
} from '../notificationPlan';
import { PrayerSchedule } from '../../types';

describe('Notification Plan Engine (buildNotificationPlan)', () => {
  const sampleSchedule: PrayerSchedule[] = [
    {
      date: '2026-10-08', // Thursday
      fajr_azan: '05:00',
      fajr_iqamah: '05:30',
      dhuhr_azan: '12:15',
      dhuhr_iqamah: '12:45',
      asr_azan: '15:45',
      asr_iqamah: '16:15',
      maghrib_azan: '18:00',
      maghrib_iqamah: '18:10',
      isha_azan: '19:30',
      isha_iqamah: '20:15',
      sunrise: '06:01',
      jummah_azan: null,
      jummah_bayan: null,
      jummah_iqamah: null,
      note_en: null,
      note_ta: null,
    },
    {
      date: '2026-10-09', // Friday
      fajr_azan: '05:00',
      fajr_iqamah: '05:30',
      dhuhr_azan: '12:15',
      dhuhr_iqamah: '12:45',
      asr_azan: '15:45',
      asr_iqamah: '16:15',
      maghrib_azan: '18:00',
      maghrib_iqamah: '18:10',
      isha_azan: '19:30',
      isha_iqamah: '20:15',
      sunrise: '06:01',
      jummah_azan: '12:30',
      jummah_bayan: '12:45',
      jummah_iqamah: '13:15',
      note_en: "Jumu'ah Mubarak",
      note_ta: 'ஜும்ஆ தொழுகை',
    },
  ];

  test('Friday swap: Dhuhr slot uses jummah_iqamah and Jumu\'ah label on Fridays', () => {
    // Current time: early morning of Thursday 2026-10-08 04:00 AM IST
    const now = new Date('2026-10-07T22:30:00.000Z'); // 04:00 AM IST

    const plan = buildNotificationPlan({
      schedule: sampleSchedule,
      prefs: DEFAULT_PREFS,
      now,
      timezone: 'Asia/Kolkata',
      platform: 'android',
      language: 'en',
    });

    // Check Thursday Dhuhr (non-Friday)
    const thuDhuhrNotifs = plan.filter((n) => n.id.includes('2026-10-08-dhuhr'));
    expect(thuDhuhrNotifs.length).toBeGreaterThan(0);
    expect(thuDhuhrNotifs[0].title).toContain('Dhuhr');

    // Check Friday Dhuhr (Friday) -> Must use Jumu'ah and 13:15 iqamah
    const friDhuhrNotifs = plan.filter((n) => n.id.includes('2026-10-09-dhuhr'));
    expect(friDhuhrNotifs.length).toBeGreaterThan(0);
    // Friday dhuhr title must be labelled Jumu'ah
    expect(friDhuhrNotifs[0].title).toContain("Jumu'ah");
    // Iqamah is 13:15, with 15-min offset it fires at 13:00 IST = 07:30 UTC
    const offset15 = friDhuhrNotifs.find((n) => n.id.endsWith('-15'));
    expect(offset15).toBeDefined();
    expect(offset15?.fireAt.toISOString()).toBe('2026-10-09T07:30:00.000Z');
  });

  test('Past times skipped: notifications before now are omitted', () => {
    // Set now to Thursday 2026-10-08 at 17:00 IST = 11:30 UTC
    // Fajr, Dhuhr, and Asr on 2026-10-08 are in the past
    const now = new Date('2026-10-08T11:30:00.000Z');

    const plan = buildNotificationPlan({
      schedule: sampleSchedule,
      prefs: DEFAULT_PREFS,
      now,
      timezone: 'Asia/Kolkata',
      platform: 'android',
      language: 'en',
    });

    // Fajr, Dhuhr, Asr on 2026-10-08 should not be scheduled
    const oct8Past = plan.filter(
      (n) =>
        n.id.includes('2026-10-08-fajr') ||
        n.id.includes('2026-10-08-dhuhr') ||
        n.id.includes('2026-10-08-asr')
    );
    expect(oct8Past).toHaveLength(0);

    // Maghrib (Iqamah 18:10 IST = 12:40 UTC) and Isha should be present
    const oct8Upcoming = plan.filter((n) => n.id.includes('2026-10-08-maghrib') || n.id.includes('2026-10-08-isha'));
    expect(oct8Upcoming.length).toBeGreaterThan(0);
  });

  test('Android cap: does not exceed 400 scheduled notifications', () => {
    // Generate 45 days of schedule with all 4 offsets enabled (45 * 5 * 4 = 900 potential notifications)
    const longSchedule: PrayerSchedule[] = [];
    for (let i = 1; i <= 45; i++) {
      const dayStr = String(i).padStart(2, '0');
      longSchedule.push({
        date: `2026-10-${dayStr}`,
        fajr_azan: '05:00',
        fajr_iqamah: '05:30',
        dhuhr_azan: '12:15',
        dhuhr_iqamah: '12:45',
        asr_azan: '15:45',
        asr_iqamah: '16:15',
        maghrib_azan: '18:00',
        maghrib_iqamah: '18:10',
        isha_azan: '19:30',
        isha_iqamah: '20:15',
        sunrise: '06:01',
        jummah_azan: null,
        jummah_bayan: null,
        jummah_iqamah: null,
        note_en: null,
        note_ta: null,
      });
    }

    const allOffsetsPrefs: UserPrayerPrefs = {
      ...DEFAULT_PREFS,
      enabledOffsets: { 30: true, 15: true, 5: true, 0: true },
    };

    const now = new Date('2026-10-01T00:00:00.000Z');

    const plan = buildNotificationPlan({
      schedule: longSchedule,
      prefs: allOffsetsPrefs,
      now,
      timezone: 'Asia/Kolkata',
      platform: 'android',
      language: 'en',
    });

    expect(plan.length).toBeLessThanOrEqual(400);
  });

  test('iOS cap of 60: enforces 60-notification rolling ceiling', () => {
    const longSchedule: PrayerSchedule[] = [];
    for (let i = 1; i <= 30; i++) {
      const dayStr = String(i).padStart(2, '0');
      longSchedule.push({
        date: `2026-10-${dayStr}`,
        fajr_azan: '05:00',
        fajr_iqamah: '05:30',
        dhuhr_azan: '12:15',
        dhuhr_iqamah: '12:45',
        asr_azan: '15:45',
        asr_iqamah: '16:15',
        maghrib_azan: '18:00',
        maghrib_iqamah: '18:10',
        isha_azan: '19:30',
        isha_iqamah: '20:15',
        sunrise: '06:01',
        jummah_azan: null,
        jummah_bayan: null,
        jummah_iqamah: null,
        note_en: null,
        note_ta: null,
      });
    }

    const now = new Date('2026-10-01T00:00:00.000Z');

    const plan = buildNotificationPlan({
      schedule: longSchedule,
      prefs: DEFAULT_PREFS,
      now,
      timezone: 'Asia/Kolkata',
      platform: 'ios',
      language: 'en',
    });

    expect(plan.length).toBeLessThanOrEqual(60);
  });

  test('Timezone conversion when device timezone differs from masjid timezone', () => {
    // Isha Iqamah is 20:15 in Asia/Kolkata (+05:30)
    // 20:15 IST minus 15 min offset = 20:00 IST = 14:30:00.000Z UTC
    const now = new Date('2026-10-08T00:00:00.000Z');

    const plan = buildNotificationPlan({
      schedule: [sampleSchedule[0]],
      prefs: DEFAULT_PREFS,
      now,
      timezone: 'Asia/Kolkata',
      platform: 'android',
      language: 'en',
    });

    const isha15 = plan.find((n) => n.id === 'prayer-2026-10-08-isha-15');
    expect(isha15).toBeDefined();
    expect(isha15?.fireAt.toISOString()).toBe('2026-10-08T14:30:00.000Z');
  });

  test('Disabled prayers and offsets are respected', () => {
    const customPrefs: UserPrayerPrefs = {
      enabledPrayers: {
        fajr: false, // Disabled
        dhuhr: true,
        asr: true,
        maghrib: false, // Disabled
        isha: true,
      },
      enabledOffsets: {
        30: false, // Disabled
        15: true,
        5: false,
        0: true, // Enabled
      },
      sound: 'silent',
      timeFormat: '24h',
    };

    const now = new Date('2026-10-08T00:00:00.000Z');

    const plan = buildNotificationPlan({
      schedule: [sampleSchedule[0]],
      prefs: customPrefs,
      now,
      timezone: 'Asia/Kolkata',
      platform: 'android',
      language: 'en',
    });

    // Check that no Fajr or Maghrib reminders exist
    expect(plan.some((n) => n.id.includes('-fajr-'))).toBe(false);
    expect(plan.some((n) => n.id.includes('-maghrib-'))).toBe(false);

    // Check that 30-min offset does not exist
    expect(plan.some((n) => n.id.endsWith('-30'))).toBe(false);

    // Check that 15 and 0 offsets exist
    expect(plan.some((n) => n.id.endsWith('-15'))).toBe(true);
    expect(plan.some((n) => n.id.endsWith('-0'))).toBe(true);

    // Check channel is silent
    expect(plan.every((n) => n.channelId === 'prayer-reminders-silent')).toBe(true);
  });

  test('Midnight boundaries and early morning Fajr calculation', () => {
    // Fajr is 05:30 IST. 30-min offset fires at 05:00 IST = 23:30 UTC of previous day!
    const now = new Date('2026-10-07T20:00:00.000Z');

    const plan = buildNotificationPlan({
      schedule: [sampleSchedule[0]],
      prefs: DEFAULT_PREFS,
      now,
      timezone: 'Asia/Kolkata',
      platform: 'android',
      language: 'en',
    });

    const fajr30 = plan.find((n) => n.id === 'prayer-2026-10-08-fajr-30');
    expect(fajr30).toBeDefined();
    // 05:00 IST on Oct 8 is 23:30 UTC on Oct 7
    expect(fajr30?.fireAt.toISOString()).toBe('2026-10-07T23:30:00.000Z');
  });

  test('formatTimeDisplay formats 12h and 24h correctly', () => {
    expect(formatTimeDisplay('20:15:00', '12h')).toBe('8:15 PM');
    expect(formatTimeDisplay('05:30', '12h')).toBe('5:30 AM');
    expect(formatTimeDisplay('12:00:00', '12h')).toBe('12:00 PM');
    expect(formatTimeDisplay('20:15', '24h')).toBe('20:15');
    expect(formatTimeDisplay('05:30', '24h')).toBe('05:30');
  });
});
