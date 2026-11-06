import { ExpoConfig, ConfigContext } from 'expo/config';
import fs from 'fs';
import path from 'path';

const localGoogleServices = path.resolve(__dirname, 'google-services.json');
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || (fs.existsSync(localGoogleServices) ? './google-services.json' : undefined);

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Masjidul Ihsaan',
  slug: 'masjidul-ihsaan',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'masjidulihsaan',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#032b1f',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#032b1f',
    },
    package: 'com.ladderflow.masjidulihsaan',
    ...(googleServicesFile ? { googleServicesFile } : {}),
    permissions: [
      'RECEIVE_BOOT_COMPLETED',
      'SCHEDULE_EXACT_ALARM',
      'POST_NOTIFICATIONS',
      'READ_CALENDAR',
      'WRITE_CALENDAR',
    ],
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-localization',
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#064e3b',
        sounds: [],
      },
    ],
    [
      'expo-calendar',
      {
        calendarPermission: 'Allow Masjidul Ihsaan to add events and bayans to your calendar.',
      },
    ],
  ],
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL || 'https://masjidul-ihsaan.vercel.app/privacy',
    eas: {
      projectId: process.env.EAS_PROJECT_ID || '00000000-0000-0000-0000-000000000000',
    },
  },
});
