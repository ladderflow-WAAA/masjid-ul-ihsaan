-- ==============================================================================
-- Masjidul Ihsaan Seed Data (seed.sql)
-- ==============================================================================

-- 1. Masjid Settings (id = 1)
INSERT INTO public.masjid_settings (
  id,
  name_en,
  name_ta,
  name_ar,
  address,
  maps_url,
  latitude,
  longitude,
  timezone,
  contact_phone,
  latest_version,
  apk_url,
  updated_at
) VALUES (
  1,
  'Masjidul Ihsaan',
  'மஸ்ஜிதுல் இஹ்சான்',
  'مَسْجِدُ الْإِحْسَانِ',
  'Skylab Avenue, Sithalapakkam, Tambaram, Tamil Nadu 600045, India',
  'https://maps.app.goo.gl/wPgTiSDwAh24Xoa49',
  12.894208,
  80.1898496,
  'Asia/Kolkata',
  '+91 94440 00000',
  '1.0.0',
  'https://github.com/ladderflow/masjid-app/releases/latest/download/masjidul-ihsaan.apk',
  now()
) ON CONFLICT (id) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_ta = EXCLUDED.name_ta,
  name_ar = EXCLUDED.name_ar,
  address = EXCLUDED.address,
  maps_url = EXCLUDED.maps_url,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  timezone = EXCLUDED.timezone,
  contact_phone = EXCLUDED.contact_phone,
  latest_version = EXCLUDED.latest_version,
  apk_url = EXCLUDED.apk_url,
  updated_at = now();

-- 2. Prayer Schedule (October 1, 2026 to November 15, 2026: 46 days)
INSERT INTO public.prayer_schedule (
  date,
  fajr_azan, fajr_iqamah,
  dhuhr_azan, dhuhr_iqamah,
  asr_azan, asr_iqamah,
  maghrib_azan, maghrib_iqamah,
  isha_azan, isha_iqamah,
  sunrise,
  jummah_azan, jummah_bayan, jummah_iqamah,
  note_en, note_ta,
  updated_at
)
SELECT
  d::date,
  '05:00:00'::time AS fajr_azan,
  '05:30:00'::time AS fajr_iqamah,
  '12:15:00'::time AS dhuhr_azan,
  '12:45:00'::time AS dhuhr_iqamah,
  '15:45:00'::time AS asr_azan,
  '16:15:00'::time AS asr_iqamah,
  '18:00:00'::time AS maghrib_azan,
  '18:10:00'::time AS maghrib_iqamah,
  '19:30:00'::time AS isha_azan,
  '20:15:00'::time AS isha_iqamah,
  '06:01:00'::time AS sunrise,
  CASE WHEN EXTRACT(DOW FROM d) = 5 THEN '12:30:00'::time ELSE NULL END AS jummah_azan,
  CASE WHEN EXTRACT(DOW FROM d) = 5 THEN '12:45:00'::time ELSE NULL END AS jummah_bayan,
  CASE WHEN EXTRACT(DOW FROM d) = 5 THEN '13:15:00'::time ELSE NULL END AS jummah_iqamah,
  CASE WHEN EXTRACT(DOW FROM d) = 5 THEN 'Jumu''ah Mubarak' ELSE NULL END AS note_en,
  CASE WHEN EXTRACT(DOW FROM d) = 5 THEN 'ஜும்ஆ தொழுகை' ELSE NULL END AS note_ta,
  now() AS updated_at
FROM generate_series('2026-10-01'::date, '2026-11-15'::date, '1 day'::interval) d
ON CONFLICT (date) DO UPDATE SET
  fajr_azan = EXCLUDED.fajr_azan,
  fajr_iqamah = EXCLUDED.fajr_iqamah,
  dhuhr_azan = EXCLUDED.dhuhr_azan,
  dhuhr_iqamah = EXCLUDED.dhuhr_iqamah,
  asr_azan = EXCLUDED.asr_azan,
  asr_iqamah = EXCLUDED.asr_iqamah,
  maghrib_azan = EXCLUDED.maghrib_azan,
  maghrib_iqamah = EXCLUDED.maghrib_iqamah,
  isha_azan = EXCLUDED.isha_azan,
  isha_iqamah = EXCLUDED.isha_iqamah,
  sunrise = EXCLUDED.sunrise,
  jummah_azan = EXCLUDED.jummah_azan,
  jummah_bayan = EXCLUDED.jummah_bayan,
  jummah_iqamah = EXCLUDED.jummah_iqamah,
  note_en = EXCLUDED.note_en,
  note_ta = EXCLUDED.note_ta,
  updated_at = now();

-- 3. Announcements
-- Announcement 1: Schedule Change (Isha time updated, as in WhatsApp message)
INSERT INTO public.announcements (
  id,
  title_en,
  title_ta,
  body_en,
  body_ta,
  speaker_name,
  event_at,
  category,
  banner_url,
  is_urgent,
  is_published,
  published_at,
  push_requested,
  push_sent_at,
  created_at,
  updated_at
) VALUES (
  'e2b4f910-1845-42d6-8a32-9c17e3f89011',
  'Isha Prayer Time Change',
  'இஷா தொழுகை நேர மாற்றம்',
  'Isha Iqamah time at Masjidul Ihsaan has been updated to 8:15 PM starting this week. Please take note of the new timing.',
  'மஸ்ஜிதுல் இஹ்சானில் இன்ஷா அல்லாஹ் வரும் வாரம் முதல் இஷா தொழுகை இகாமத் நேரம் இரவு 8:15 மணியாக மாற்றப்பட்டுள்ளது. அனைவரும் குறித்துக் கொள்ளவும்.',
  NULL,
  NULL,
  'schedule_change',
  NULL,
  true,
  true,
  '2026-10-07 18:00:00+05:30',
  true,
  '2026-10-07 18:05:00+05:30',
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Announcement 2: Jumu'ah Bayan
INSERT INTO public.announcements (
  id,
  title_en,
  title_ta,
  body_en,
  body_ta,
  speaker_name,
  event_at,
  category,
  banner_url,
  is_urgent,
  is_published,
  published_at,
  push_requested,
  push_sent_at,
  created_at,
  updated_at
) VALUES (
  'f7c5a821-2956-43e7-9b43-0d28f4a90122',
  'Weekly Jumu''ah Bayan',
  'வாராந்திர ஜும்ஆ பயான்',
  'InshaAllah, this week''s Jumu''ah Bayan will commence at 12:45 PM followed by Iqamah at 1:15 PM. All brothers are requested to arrive on time.',
  'இன்ஷா அல்லாஹ் இந்த வார ஜும்ஆ பயான் மதியம் 12:45 மணிக்கு தொடங்கும், இகாமத் 1:15 மணிக்கு நடைபெறும். அனைவரும் உரிய நேரத்தில் வருகை தந்து பயனடையுமாறு கேட்டுக்கொள்கிறோம்.',
  'Moulavi Abdul Rahman',
  '2026-10-09 12:45:00+05:30',
  'bayan',
  NULL,
  false,
  true,
  '2026-10-05 10:00:00+05:30',
  false,
  NULL,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;

-- Announcement 3: Community Cleaning & Madrasa Session
INSERT INTO public.announcements (
  id,
  title_en,
  title_ta,
  body_en,
  body_ta,
  speaker_name,
  event_at,
  category,
  banner_url,
  is_urgent,
  is_published,
  published_at,
  push_requested,
  push_sent_at,
  created_at,
  updated_at
) VALUES (
  'a1b2c3d4-3a67-44f8-ac54-1e39f5b01233',
  'Weekend Madrasa Admission Open',
  'வார இறுதி மத்ரஸா மாணவர் சேர்க்கை',
  'Admissions for weekend Islamic studies and basic Arabic for children are now open at Masjidul Ihsaan. Contact the management committee for details.',
  'மஸ்ஜிதுல் இஹ்சானில் குழந்தைகளுக்கான வார இறுதி இஸ்லாமிய கல்வி மற்றும் அடிப்படை அரபி வகுப்புகளுக்கான மாணவர் சேர்க்கை தொடங்கப்பட்டுள்ளது. நிர்வாகத்தை தொடர்பு கொள்ளவும்.',
  'Masjid Committee',
  '2026-10-11 09:30:00+05:30',
  'community',
  NULL,
  false,
  true,
  '2026-10-04 09:00:00+05:30',
  false,
  NULL,
  now(),
  now()
) ON CONFLICT (id) DO NOTHING;
