export type AnnouncementCategory =
  | 'general'
  | 'bayan'
  | 'janazah'
  | 'community'
  | 'ramadan'
  | 'schedule_change';

export interface MasjidSettings {
  id: number;
  name_en: string;
  name_ta: string;
  name_ar: string;
  address: string | null;
  maps_url: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
  contact_phone: string | null;
  latest_version: string | null;
  apk_url: string | null;
  updated_at: string;
}

export interface PrayerSchedule {
  date: string; // YYYY-MM-DD
  fajr_azan: string; // HH:mm or HH:mm:ss
  fajr_iqamah: string;
  dhuhr_azan: string;
  dhuhr_iqamah: string;
  asr_azan: string;
  asr_iqamah: string;
  maghrib_azan: string;
  maghrib_iqamah: string;
  isha_azan: string;
  isha_iqamah: string;
  sunrise: string | null;
  jummah_azan: string | null;
  jummah_bayan: string | null;
  jummah_iqamah: string | null;
  note_en: string | null;
  note_ta: string | null;
  updated_at?: string;
  updated_by?: string | null;
}

export interface Announcement {
  id: string;
  title_en: string | null;
  title_ta: string | null;
  body_en: string | null;
  body_ta: string | null;
  speaker_name: string | null;
  event_at: string | null;
  category: AnnouncementCategory;
  banner_url: string | null;
  is_urgent: boolean;
  is_published: boolean;
  published_at: string | null;
  push_requested: boolean;
  push_sent_at: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface Device {
  expo_push_token: string;
  platform: 'android' | 'ios';
  language: 'en' | 'ta';
  created_at: string;
  last_seen_at: string;
}

export interface AdminRecord {
  user_id: string;
  created_at: string;
  email?: string;
}
