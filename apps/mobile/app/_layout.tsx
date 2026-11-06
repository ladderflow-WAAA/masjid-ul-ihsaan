import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  NotoSansTamil_400Regular,
  NotoSansTamil_500Medium,
  NotoSansTamil_600SemiBold,
  NotoSansTamil_700Bold,
} from '@expo-google-fonts/noto-sans-tamil';
import {
  NotoNaskhArabic_400Regular,
  NotoNaskhArabic_700Bold,
} from '@expo-google-fonts/noto-naskh-arabic';
import '../src/i18n';
import { performSync, registerBackgroundSyncTask } from '../src/services/sync';
import { setupNotificationChannels } from '../src/services/notificationScheduler';
import { getAppLanguage } from '../src/services/storage';
import i18n from '../src/i18n';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const router = useRouter();

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    NotoSansTamil_400Regular,
    NotoSansTamil_500Medium,
    NotoSansTamil_600SemiBold,
    NotoSansTamil_700Bold,
    NotoNaskhArabic_400Regular,
    NotoNaskhArabic_700Bold,
  });

  useEffect(() => {
    async function initApp() {
      // Load saved language if user previously selected it
      const savedLang = await getAppLanguage();
      if (savedLang) {
        await i18n.changeLanguage(savedLang);
      }

      await setupNotificationChannels();
      await registerBackgroundSyncTask();
      await performSync(false);
    }

    initApp();

    // Listen for notification taps to deep link to announcement detail
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data && data.announcementId) {
        router.push(`/announcements/${data.announcementId}`);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" backgroundColor="#0A1F17" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0A1F17',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: '600',
            fontFamily: 'Inter_600SemiBold',
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="announcements/[id]"
          options={{
            title: i18n.t('announcements.title'),
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="battery-guide"
          options={{
            title: i18n.t('settings.batteryGuide'),
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}
