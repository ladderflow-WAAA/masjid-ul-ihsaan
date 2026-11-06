-- ==============================================================================
-- Masjidul Ihsaan Schema Migration (0001_init.sql)
-- ==============================================================================

-- 1. Custom Types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'announcement_category') THEN
    CREATE TYPE public.announcement_category AS ENUM (
      'general',
      'bayan',
      'janazah',
      'community',
      'ramadan',
      'schedule_change'
    );
  END IF;
END$$;

-- 2. Admins Table
CREATE TABLE IF NOT EXISTS public.admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helper function to check admin privileges
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE user_id = auth.uid()
  );
$$;

-- 3. Masjid Settings Table (Single row enforcement)
CREATE TABLE IF NOT EXISTS public.masjid_settings (
  id int PRIMARY KEY CHECK (id = 1),
  name_en text NOT NULL,
  name_ta text NOT NULL,
  name_ar text NOT NULL,
  address text,
  maps_url text,
  latitude double precision,
  longitude double precision,
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  contact_phone text,
  latest_version text,
  apk_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Prayer Schedule Table
CREATE TABLE IF NOT EXISTS public.prayer_schedule (
  date date PRIMARY KEY,
  fajr_azan time NOT NULL,
  fajr_iqamah time NOT NULL,
  dhuhr_azan time NOT NULL,
  dhuhr_iqamah time NOT NULL,
  asr_azan time NOT NULL,
  asr_iqamah time NOT NULL,
  maghrib_azan time NOT NULL,
  maghrib_iqamah time NOT NULL,
  isha_azan time NOT NULL,
  isha_iqamah time NOT NULL,
  sunrise time,
  jummah_azan time,
  jummah_bayan time,
  jummah_iqamah time,
  note_en text,
  note_ta text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT check_fajr CHECK (fajr_azan <= fajr_iqamah),
  CONSTRAINT check_dhuhr CHECK (dhuhr_azan <= dhuhr_iqamah),
  CONSTRAINT check_asr CHECK (asr_azan <= asr_iqamah),
  CONSTRAINT check_maghrib CHECK (maghrib_azan <= maghrib_iqamah),
  CONSTRAINT check_isha CHECK (isha_azan <= isha_iqamah)
);

-- 5. Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text,
  title_ta text,
  body_en text,
  body_ta text,
  speaker_name text,
  event_at timestamptz,
  category public.announcement_category NOT NULL DEFAULT 'general',
  banner_url text,
  is_urgent boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  push_requested boolean NOT NULL DEFAULT false,
  push_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT check_has_content CHECK (
    ((title_en IS NOT NULL AND length(trim(title_en)) > 0) AND (body_en IS NOT NULL AND length(trim(body_en)) > 0)) OR
    ((title_ta IS NOT NULL AND length(trim(title_ta)) > 0) AND (body_ta IS NOT NULL AND length(trim(body_ta)) > 0))
  )
);

-- 6. Devices Table (For Push Notifications)
CREATE TABLE IF NOT EXISTS public.devices (
  expo_push_token text PRIMARY KEY,
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  language text NOT NULL CHECK (language IN ('en', 'ta')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Security Definer RPCs for anonymous device registration
CREATE OR REPLACE FUNCTION public.register_device(token text, platform text, language text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF token IS NULL OR length(trim(token)) < 10 OR (token NOT LIKE 'ExponentPushToken[%' AND token NOT LIKE 'ExpoPushToken[%') THEN
    RAISE EXCEPTION 'Invalid push token format';
  END IF;

  IF platform IS NULL OR platform NOT IN ('android', 'ios') THEN
    RAISE EXCEPTION 'Invalid platform';
  END IF;

  IF language IS NULL OR language NOT IN ('en', 'ta') THEN
    RAISE EXCEPTION 'Invalid language';
  END IF;

  INSERT INTO public.devices (expo_push_token, platform, language, last_seen_at)
  VALUES (trim(token), platform, language, now())
  ON CONFLICT (expo_push_token) DO UPDATE
  SET platform = EXCLUDED.platform,
      language = EXCLUDED.language,
      last_seen_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.unregister_device(token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF token IS NULL THEN
    RETURN;
  END IF;
  DELETE FROM public.devices WHERE expo_push_token = trim(token);
END;
$$;

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_prayer_schedule_date ON public.prayer_schedule(date);
CREATE INDEX IF NOT EXISTS idx_announcements_published ON public.announcements(published_at DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_announcements_category ON public.announcements(category);
CREATE INDEX IF NOT EXISTS idx_devices_language ON public.devices(language);

-- 9. Row Level Security (RLS)
ALTER TABLE public.masjid_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prayer_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- masjid_settings policies
CREATE POLICY "masjid_settings_select_public" ON public.masjid_settings
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "masjid_settings_write_admin" ON public.masjid_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- prayer_schedule policies
CREATE POLICY "prayer_schedule_select_public" ON public.prayer_schedule
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "prayer_schedule_write_admin" ON public.prayer_schedule
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- announcements policies
CREATE POLICY "announcements_select_published" ON public.announcements
  FOR SELECT TO anon, authenticated
  USING (is_published = true OR public.is_admin());

CREATE POLICY "announcements_write_admin" ON public.announcements
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- devices policies (public cannot read or write directly; only RPCs and admins)
CREATE POLICY "devices_select_admin" ON public.devices
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "devices_write_admin" ON public.devices
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- admins policies
CREATE POLICY "admins_select_admin" ON public.admins
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "admins_write_admin" ON public.admins
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 10. Storage Bucket Setup ("banners")
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners',
  'banners',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Storage bucket RLS policies
CREATE POLICY "banners_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'banners');

CREATE POLICY "banners_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'banners' AND public.is_admin());

CREATE POLICY "banners_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'banners' AND public.is_admin())
  WITH CHECK (bucket_id = 'banners' AND public.is_admin());

CREATE POLICY "banners_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'banners' AND public.is_admin());
