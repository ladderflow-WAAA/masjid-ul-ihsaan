# Masjidul Ihsaan

Production-grade prayer timetable (Azan & Iqamah) and community announcement system for **Masjidul Ihsaan** (மஸ்ஜிதுல் இஹ்சான்), Sithalapakkam, Tambaram, Tamil Nadu.

This repository provides:
1. **Native Android Congregation App (`apps/mobile`)**: Built with React Native & Expo, distributed as a standalone signed APK. Runs with zero congregation account requirement, fully offline-cached, local battery-reliable scheduled prayer alarms, and push notifications for urgent masjid announcements and schedule changes.
2. **Web Admin & Public Portal (`apps/admin`)**: Next.js App Router portal deployed to Vercel. Serves a responsive public timetable (fallback for non-Android users) and a committee administration dashboard to manage timings, bulk updates, and broadcast push notifications.
3. **Supabase Backend (`supabase/`)**: PostgreSQL schema, Row-Level Security (RLS), security-definer RPCs for anonymous device registration, and storage bucket configuration.

---

## 1. Supabase Project Setup & Database Migration

Supabase Free Tier covers this workload with zero ongoing cost.

### Steps:
1. Log in to [supabase.com](https://supabase.com) and click **New project**.
2. Select your nearest region (e.g. `ap-south-1` Mumbai) and choose a secure database password.
3. Once provisioned, open **SQL Editor** in the Supabase dashboard.
4. Copy the entire contents of `supabase/migrations/0001_init.sql` and run it. This establishes:
   - `masjid_settings` table (id = 1 constraint)
   - `admins` table with `is_admin()` security definer function
   - `prayer_schedule` table with chronological checks
   - `announcements` table and `announcement_category` enum
   - `devices` table with `register_device` and `unregister_device` security definer RPCs
   - Row-Level Security (RLS) policies on all tables and storage
   - Public `banners` storage bucket with 2 MB file limit
5. Copy the entire contents of `supabase/seed.sql` and run it in the SQL Editor. This populates initial settings, coordinates, initial announcements (including the Isha time change), and 46 days of timetable rows.
6. Create your first administrative user:
   - In Supabase dashboard, go to **Authentication > Users > Add user > Create user**.
   - Enter your email and a strong password.
   - Copy the newly created **User UID** (UUID).
   - In the SQL Editor, execute:
     ```sql
     INSERT INTO public.admins (user_id) VALUES ('<COPIED_USER_UID>');
     ```
7. Retrieve your API Keys from **Project Settings > API**:
   - `Project URL`
   - `anon public` key
   - `service_role` secret key

---

## 2. Vercel Web Deployment (`apps/admin`)

The public timetable and committee portal deploy seamlessly on Vercel's free Hobby plan.

> **Note on Vercel Hobby:** Vercel Hobby is free for personal and non-commercial community projects.

### Steps:
1. Push your repository to GitHub or connect it to Vercel via the Vercel dashboard.
2. Click **Add New > Project** and import the repository.
3. In **Root Directory**, click **Edit** and set it to:
   ```text
   apps/admin
   ```
4. Set the following **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase Project URL (`https://<project-ref>.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase `anon` public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase `service_role` private key
   - `EXPO_ACCESS_TOKEN`: (Optional) Leave empty unless your Expo organization requires an access token.
5. Click **Deploy**. Vercel will run `npm run build` and provision your site (e.g., `https://masjidul-ihsaan.vercel.app`).
6. Verify:
   - `/`: Public timetable loads with live times.
   - `/privacy`: Privacy policy renders with data handling details.
   - `/login`: Admin login functions with email/password.

---

## 3. Firebase Cloud Messaging (FCM) Push Setup (Free)

Android push notifications for announcements use Expo Push API backed by Firebase Cloud Messaging v1.

### Steps:
1. Go to the [Firebase Console](https://console.firebase.google.com) and create a free project named `Masjidul Ihsaan`.
2. Under **Project Overview**, click the **Android** icon to add an Android app:
   - **Android package name**: `com.ladderflow.masjidulihsaan` (must match `apps/mobile/app.config.ts`)
   - App nickname: `Masjidul Ihsaan`
3. Download the generated `google-services.json` file.
4. Place `google-services.json` in `apps/mobile/google-services.json` for local builds (it is gitignored).
5. Generate an FCM v1 Service Account Key:
   - In Firebase Console, go to **Project settings > Service accounts**.
   - Click **Generate new private key**. Download the JSON file.
6. Upload the FCM credentials to Expo:
   - Run in your terminal:
     ```bash
     eas credentials
     ```
   - Select `Android > production/preview > Push Notifications > Google Service Account Key`.
   - Provide the Firebase service account JSON file.
7. Test push notifications anytime using Expo's testing tool at [expo.dev/notifications](https://expo.dev/notifications) with your device push token.

---

## 4. Expo Application Services (EAS) Android Builds

EAS Free Tier provides free monthly cloud build quotas for standalone APK generation.

### Steps:
1. Install EAS CLI globally if not already present:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to your free Expo account:
   ```bash
   eas login
   ```
3. Initialize the project:
   ```bash
   cd apps/mobile
   eas project:init
   ```
4. Set environment secrets in EAS (or in your local `.env`):
   ```bash
   eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://<your-project>.supabase.co" --type string
   eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<your-anon-key>" --type string
   eas secret:create --name EXPO_PUBLIC_PRIVACY_URL --value "https://<your-vercel-domain>/privacy" --type string
   ```
5. Build the standalone Release APK for congregation distribution:
   ```bash
   eas build --platform android --profile preview
   ```
   EAS will compile and provide a direct download URL for the signed `.apk` file.

### Free Quota Fallback:
If your monthly EAS free cloud build minutes run out, build the APK locally on your machine with zero cloud dependency:
```bash
# Requires Android Studio / Android SDK installed locally
eas build --platform android --profile preview --local
```
Or generate the raw Android project:
```bash
npx expo run:android --variant release
```

---

## 5. Backing Up the Android Keystore

Android requires every future update of the APK to be signed by the **exact same keystore**. If the key is lost, phones will refuse to update the app and will show "App not installed: Signature mismatch".

### Backup Steps:
1. Export the EAS-generated keystore:
   ```bash
   cd apps/mobile
   eas credentials -p android
   ```
2. Select `Keystore: Manage everything related to your Android Keystore` > `Download credentials`.
3. Save the downloaded `.jks` file, keystore password, key alias, and key password in a secure, backed-up location (e.g. encrypted drive or committee vault). Never commit `.jks` files or passwords to git.

---

## 6. Publishing the APK & Congregational Distribution

### Publishing to GitHub Releases:
1. Go to your GitHub repository > **Releases > Draft a new release**.
2. Tag version: `v1.0.0` (matching `latest_version` in settings).
3. Upload the APK file generated by EAS (e.g., `masjidul-ihsaan.apk`).
4. Publish the release and copy the direct APK download link (e.g., `https://github.com/ladderflow/masjid-app/releases/latest/download/masjidul-ihsaan.apk`).
5. In the Admin Web Portal (`/settings`), paste this URL into **Release APK URL** and ensure **Latest App Version** matches `1.0.0`.
6. Whenever you bump the version, all installed mobile apps will immediately display a banner prompting congregation members to download the update.

### Installing on Android Phones:
1. Download the `.apk` on the Android device.
2. Tap the downloaded file to install.
3. If Android prompts "Install unknown apps", tap **Settings** and toggle **Allow from this source**.
4. If Google Play Protect displays a prompt ("Unrecognized app"), tap **More details > Install anyway**.

### WhatsApp Announcement Template:

#### Tamil:
> அஸ்ஸலாமு அலைக்கும் வரஹ்மத்துல்லாஹி வபரகாத்துஹு.  
> **மஸ்ஜிதுல் இஹ்சான் (சித்தாலப்பாக்கம்)** தொழுகை நேரங்கள் மற்றும் முக்கிய அறிவிப்புகளை அறிந்துகொள்ள நமது பள்ளிவாசலின் புதிய ஆண்ட்ராய்டு செயலியை பதிவிறக்கம் செய்துகொள்ளுங்கள்.  
> 
> நேரடி பதிவிறக்கம் (APK):  
> https://github.com/ladderflow/masjid-app/releases/latest/download/masjidul-ihsaan.apk  
> 
> இணையதள அட்டவணை:  
> https://masjidul-ihsaan.vercel.app  
> 
> (ஆண்ட்ராய்டு போனில் இன்ஸ்டால் செய்யும்போது 'Install anyway' கொடுக்கவும்). ஜஸாக்கல்லாஹு ஹைரா.

#### English:
> Assalamu Alaikum Warahmathullahi Wabarakathuhu.  
> Download the official **Masjidul Ihsaan (Sithalapakkam)** Android app for daily prayer timings (Azan & Iqamah) and community announcements:  
> 
> Direct APK Download:  
> https://github.com/ladderflow/masjid-app/releases/latest/download/masjidul-ihsaan.apk  
> 
> Web Timetable:  
> https://masjidul-ihsaan.vercel.app  
> 
> (If prompted by Android Play Protect, tap 'More details' -> 'Install anyway'). Jazakallahu Khair.

---

## 7. Assumptions & Verification Checklist

### Assumptions:
- **Timezone**: Set to `Asia/Kolkata` (+05:30) as confirmed by the masjid address in Sithalapakkam, Tamil Nadu.
- **Prayer Offsets**: Reminders are enabled by default for 30 minutes and 15 minutes before Iqamah. Users can enable 5 minutes and 0 minutes ("At Iqamah") in settings.
- **Jumu'ah Friday Handling**: On Fridays, Dhuhr azan is set to 12:30, Bayan at 12:45, and Iqamah at 13:15.
- **Android Target**: Android 8.0 (API 26) through Android 15 (API 35). Exact alarm permissions are requested on Android 12+.

### Verify Against the Printed Board:
Verify the following placeholder timings against the physical green timetable board in the masjid:
- [ ] Fajr: Azan `05:00`, Iqamah `05:30`
- [ ] Sunrise: `06:01`
- [ ] Dhuhr: Azan `12:15`, Iqamah `12:45`
- [ ] Asr: Azan `15:45`, Iqamah `16:15`
- [ ] Maghrib: Azan `18:00`, Iqamah `18:10`
- [ ] Isha: Azan `19:30`, Iqamah `20:15` (Updated as per WhatsApp notice)
- [ ] Jumu'ah: Azan `12:30`, Bayan `12:45`, Iqamah `13:15`
- [ ] Committee Phone Number: `+91 94440 00000` (Update in Admin Settings)

---

## Verification Log

| Quality Gate | Target | Result | Notes |
| :--- | :--- | :--- | :--- |
| **Admin Typecheck** | `tsc --noEmit` in `apps/admin` | **PASS (Exit 0)** | Strict mode clean |
| **Admin Next Build** | `npm run build` in `apps/admin` | **PASS (Exit 0)** | All routes compiled and optimized |
| **Mobile Typecheck** | `tsc --noEmit` in `apps/mobile` | **PASS (Exit 0)** | Strict mode clean |
| **Mobile Unit Tests** | `npm test` (Jest) in `apps/mobile` | **PASS (8/8 Passed)** | Friday swap, caps, past filtering, timezones |
| **Expo Doctor** | `npx expo-doctor` in `apps/mobile` | **PASS (18/18 Checks)** | All SDK 52 dependencies verified |
| **Expo Android Export**| `npx expo export --platform android` | **PASS (Exit 0)** | Production Android JS bundle generated |
