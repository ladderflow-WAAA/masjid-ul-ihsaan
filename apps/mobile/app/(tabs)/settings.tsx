import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Application from 'expo-application';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import {
  Globe,
  Clock,
  Bell,
  Volume2,
  VolumeX,
  BatteryCharging,
  Shield,
  MapPin,
  Phone,
  Info,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Code2,
  ExternalLink,
} from 'lucide-react-native';
import {
  getUserPrayerPrefs,
  setUserPrayerPrefs,
  setAppLanguage,
  isPushEnabled,
  setPushEnabled,
  getCachedSettings,
  getCachedSchedule,
  getPushToken,
  setPushToken,
} from '../../src/services/storage';
import {
  reschedulePrayerReminders,
  scheduleTestReminder,
  getPendingNotificationsList,
  requestNotificationPermissions,
} from '../../src/services/notificationScheduler';
import { registerDeviceRpc, unregisterDeviceRpc } from '../../src/services/supabase';
import { performSync } from '../../src/services/sync';
import { UserPrayerPrefs, DEFAULT_PREFS, PrayerName, NotificationOffsetMinutes } from '../../src/services/notificationPlan';
import { MasjidSettings } from '../../src/types';

export default function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const [prefs, setPrefs] = useState<UserPrayerPrefs>(DEFAULT_PREFS);
  const [pushOn, setPushOn] = useState(true);
  const [settings, setSettings] = useState<MasjidSettings | null>(null);
  const [exactAlarmAllowed, setExactAlarmAllowed] = useState(true);
  const [hasNotifPermission, setHasNotifPermission] = useState(true);
  const [devTapCount, setDevTapCount] = useState(0);
  const [showDevSection, setShowDevSection] = useState(false);

  const installedVersion = Application.nativeApplicationVersion || '1.0.0';

  useEffect(() => {
    async function load() {
      const p = await getUserPrayerPrefs();
      setPrefs(p);
      const pushActive = await isPushEnabled();
      setPushOn(pushActive);
      const s = await getCachedSettings();
      setSettings(s);

      const perm = await Notifications.getPermissionsAsync();
      setHasNotifPermission(perm.status === 'granted');
      if (Platform.OS === 'android') {
        const canExact = (perm as any).canScheduleExactAlarms ?? true;
        setExactAlarmAllowed(canExact);
      }
    }
    load();
  }, []);

  const triggerReschedule = async (updatedPrefs: UserPrayerPrefs) => {
    const s = await getCachedSettings();
    const sch = await getCachedSchedule();
    const lang = (i18n.language === 'ta' ? 'ta' : 'en') as 'en' | 'ta';
    await reschedulePrayerReminders({
      schedule: sch,
      prefs: updatedPrefs,
      timezone: s?.timezone || 'Asia/Kolkata',
      language: lang,
    });
  };

  const handleLanguageChange = async (newLang: 'en' | 'ta') => {
    await i18n.changeLanguage(newLang);
    await setAppLanguage(newLang);
    await triggerReschedule(prefs);
  };

  const handleTimeFormatChange = async (format: '12h' | '24h') => {
    const updated = { ...prefs, timeFormat: format };
    setPrefs(updated);
    await setUserPrayerPrefs(updated);
    await triggerReschedule(updated);
  };

  const handleSoundChange = async (sound: 'default' | 'silent') => {
    const updated = { ...prefs, sound };
    setPrefs(updated);
    await setUserPrayerPrefs(updated);
    await triggerReschedule(updated);
  };

  const handleTogglePrayer = async (prayer: PrayerName) => {
    const updated = {
      ...prefs,
      enabledPrayers: {
        ...prefs.enabledPrayers,
        [prayer]: !prefs.enabledPrayers[prayer],
      },
    };
    setPrefs(updated);
    await setUserPrayerPrefs(updated);
    await triggerReschedule(updated);
  };

  const handleToggleOffset = async (offset: NotificationOffsetMinutes) => {
    const updated = {
      ...prefs,
      enabledOffsets: {
        ...prefs.enabledOffsets,
        [offset]: !prefs.enabledOffsets[offset],
      },
    };
    setPrefs(updated);
    await setUserPrayerPrefs(updated);
    await triggerReschedule(updated);
  };

  const handlePushToggle = async (value: boolean) => {
    setPushOn(value);
    await setPushEnabled(value);

    try {
      if (value) {
        const granted = await requestNotificationPermissions();
        if (!granted) {
          Alert.alert('Permission Required', 'Notification permission is required to receive announcements.');
          setPushOn(false);
          await setPushEnabled(false);
          return;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
        if (tokenData?.data) {
          await setPushToken(tokenData.data);
          const lang = (i18n.language === 'ta' ? 'ta' : 'en') as 'en' | 'ta';
          await registerDeviceRpc(tokenData.data, 'android', lang);
        }
      } else {
        const token = await getPushToken();
        if (token) {
          await unregisterDeviceRpc(token);
          await setPushToken(null);
        }
      }
    } catch (err) {
      console.warn('Push toggle error:', err);
    }
  };

  const handleVersionTap = () => {
    const nextCount = devTapCount + 1;
    setDevTapCount(nextCount);
    if (nextCount >= 7) {
      setShowDevSection(true);
      Alert.alert('Developer Mode', 'Diagnostics section is now visible.');
    }
  };

  const handleScheduleTestReminder = async () => {
    const lang = (i18n.language === 'ta' ? 'ta' : 'en') as 'en' | 'ta';
    await scheduleTestReminder(lang);
    Alert.alert('Success', t('settings.testScheduledSuccess'));
  };

  const handleListPending = async () => {
    const list = await getPendingNotificationsList();
    Alert.alert(
      'Pending Scheduled Notifications',
      list.length === 0
        ? 'No scheduled notifications'
        : `Total scheduled: ${list.length}\nFirst: ${list[0].identifier} at ${JSON.stringify(list[0].trigger)}`
    );
  };

  const handleCopyPushToken = async () => {
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      Alert.alert('Expo Push Token', tokenData.data);
    } catch (err: any) {
      Alert.alert('Token Error', err.message || 'Unable to retrieve token');
    }
  };

  const handleForceSync = async () => {
    const res = await performSync(true);
    Alert.alert('Sync Completed', `Synced ${res.schedule.length} schedule dates.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!hasNotifPermission && (
        <View style={styles.warningCard}>
          <AlertTriangle color="#DC2626" size={20} />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Notification Permission Denied</Text>
            <Text style={styles.warningDesc}>
              Prayer reminders cannot be sounded until notifications are allowed in system settings.
            </Text>
            <TouchableOpacity
              style={styles.warningButton}
              onPress={() => Linking.openSettings()}
            >
              <Text style={styles.warningButtonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 1. Language Preference */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Globe color="#047857" size={18} />
          <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        </View>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, i18n.language !== 'ta' && styles.toggleButtonActive]}
            onPress={() => handleLanguageChange('en')}
            accessibilityRole="button"
          >
            <Text style={[styles.toggleText, i18n.language !== 'ta' && styles.toggleTextActive]}>
              English
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, i18n.language === 'ta' && styles.toggleButtonActive]}
            onPress={() => handleLanguageChange('ta')}
            accessibilityRole="button"
          >
            <Text style={[styles.toggleText, i18n.language === 'ta' && styles.toggleTextActive]}>
              தமிழ்
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Time Format */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Clock color="#047857" size={18} />
          <Text style={styles.sectionTitle}>{t('settings.timeFormat')}</Text>
        </View>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, prefs.timeFormat === '12h' && styles.toggleButtonActive]}
            onPress={() => handleTimeFormatChange('12h')}
            accessibilityRole="button"
          >
            <Text style={[styles.toggleText, prefs.timeFormat === '12h' && styles.toggleTextActive]}>
              {t('settings.format12h')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, prefs.timeFormat === '24h' && styles.toggleButtonActive]}
            onPress={() => handleTimeFormatChange('24h')}
            accessibilityRole="button"
          >
            <Text style={[styles.toggleText, prefs.timeFormat === '24h' && styles.toggleTextActive]}>
              {t('settings.format24h')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Prayer Reminders */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Bell color="#047857" size={18} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>{t('settings.remindersSection')}</Text>
            <Text style={styles.sectionDesc}>{t('settings.remindersDescription')}</Text>
          </View>
        </View>

        <Text style={styles.subHeading}>{t('settings.prayerToggles')}</Text>
        <View style={styles.itemsList}>
          {(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as PrayerName[]).map((p) => (
            <View key={p} style={styles.switchRow}>
              <Text style={styles.itemLabel}>{t(`prayers.${p}`)}</Text>
              <Switch
                value={prefs.enabledPrayers[p]}
                onValueChange={() => handleTogglePrayer(p)}
                trackColor={{ false: '#D4D0CA', true: '#047857' }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>

        <Text style={[styles.subHeading, { marginTop: 12 }]}>{t('settings.offsets')}</Text>
        <View style={styles.itemsList}>
          {([30, 15, 5, 0] as NotificationOffsetMinutes[]).map((off) => (
            <View key={off} style={styles.switchRow}>
              <Text style={styles.itemLabel}>{t(`settings.offset${off}`)}</Text>
              <Switch
                value={prefs.enabledOffsets[off]}
                onValueChange={() => handleToggleOffset(off)}
                trackColor={{ false: '#D4D0CA', true: '#047857' }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}
        </View>

        <Text style={[styles.subHeading, { marginTop: 12 }]}>{t('settings.sound')}</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleButton, prefs.sound === 'default' && styles.toggleButtonActive]}
            onPress={() => handleSoundChange('default')}
            accessibilityRole="button"
          >
            <Volume2 color={prefs.sound === 'default' ? '#F5F3EF' : '#6B6560'} size={16} />
            <Text style={[styles.toggleText, prefs.sound === 'default' && styles.toggleTextActive]}>
              {t('settings.soundDefault')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, prefs.sound === 'silent' && styles.toggleButtonActive]}
            onPress={() => handleSoundChange('silent')}
            accessibilityRole="button"
          >
            <VolumeX color={prefs.sound === 'silent' ? '#F5F3EF' : '#6B6560'} size={16} />
            <Text style={[styles.toggleText, prefs.sound === 'silent' && styles.toggleTextActive]}>
              {t('settings.soundSilent')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Push Notifications */}
      <View style={styles.sectionCard}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.sectionTitle}>{t('settings.announcementPush')}</Text>
            <Text style={styles.sectionDesc}>{t('settings.announcementPushDesc')}</Text>
          </View>
          <Switch
            value={pushOn}
            onValueChange={handlePushToggle}
            trackColor={{ false: '#D4D0CA', true: '#047857' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* 5. Reliability */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <BatteryCharging color="#047857" size={18} />
          <Text style={styles.sectionTitle}>{t('settings.reliabilitySection')}</Text>
        </View>

        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>{t('settings.exactAlarmStatus')}</Text>
          <View style={styles.statusBadge}>
            {exactAlarmAllowed ? (
              <CheckCircle2 color="#047857" size={16} />
            ) : (
              <AlertTriangle color="#DC2626" size={16} />
            )}
            <Text style={exactAlarmAllowed ? styles.statusTextOk : styles.statusTextWarn}>
              {exactAlarmAllowed
                ? t('settings.exactAlarmGranted')
                : t('settings.exactAlarmDenied')}
            </Text>
          </View>
        </View>

        {!exactAlarmAllowed && (
          <TouchableOpacity
            style={styles.openAlarmButton}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.openAlarmButtonText}>
              {t('settings.openExactAlarmSettings')}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push('/battery-guide')}
          accessibilityRole="button"
        >
          <Text style={styles.linkRowText}>{t('settings.batteryGuide')}</Text>
          <ChevronRight color="#9C9590" size={18} />
        </TouchableOpacity>
      </View>

      {/* 6. Masjid Information */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Info color="#047857" size={18} />
          <Text style={styles.sectionTitle}>{t('settings.masjidInfo')}</Text>
        </View>

        <View style={styles.infoRow}>
          <MapPin color="#6B6560" size={16} />
          <Text style={styles.infoText}>
            {settings?.address || 'Skylab Avenue, Sithalapakkam, Tambaram, Tamil Nadu 600045'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.mapsButton}
          onPress={() =>
            Linking.openURL(settings?.maps_url || 'https://maps.app.goo.gl/wPgTiSDwAh24Xoa49')
          }
        >
          <Text style={styles.mapsButtonText}>{t('home.openInMaps')}</Text>
          <ExternalLink color="#047857" size={14} />
        </TouchableOpacity>

        {settings?.contact_phone && (
          <TouchableOpacity
            style={styles.infoRow}
            onPress={() => Linking.openURL(`tel:${settings.contact_phone}`)}
          >
            <Phone color="#6B6560" size={16} />
            <Text style={styles.infoText}>{settings.contact_phone}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.linkRow}
          onPress={() =>
            Linking.openURL(
              process.env.EXPO_PUBLIC_PRIVACY_URL || 'https://masjidul-ihsaan.vercel.app/privacy'
            )
          }
        >
          <Shield color="#6B6560" size={16} />
          <Text style={[styles.linkRowText, { marginLeft: 8 }]}>
            {t('settings.privacyPolicy')}
          </Text>
          <ExternalLink color="#9C9590" size={14} />
        </TouchableOpacity>
      </View>

      {/* 7. App Version */}
      <TouchableOpacity
        style={styles.versionContainer}
        onPress={handleVersionTap}
        activeOpacity={0.8}
      >
        <Text style={styles.versionText}>
          {t('settings.version')} {installedVersion}
        </Text>
        <Text style={styles.copyrightText}>Masjidul Ihsaan</Text>
      </TouchableOpacity>

      {/* 8. Developer Diagnostics */}
      {showDevSection && (
        <View style={styles.devCard}>
          <View style={styles.sectionHeader}>
            <Code2 color="#B45309" size={18} />
            <Text style={styles.devTitle}>{t('settings.developerSection')}</Text>
          </View>

          <TouchableOpacity style={styles.devButton} onPress={handleScheduleTestReminder}>
            <Text style={styles.devButtonText}>{t('settings.testReminder1Min')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.devButton} onPress={handleListPending}>
            <Text style={styles.devButtonText}>{t('settings.listPendingNotifs')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.devButton} onPress={handleCopyPushToken}>
            <Text style={styles.devButtonText}>{t('settings.copyPushToken')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.devButton} onPress={handleForceSync}>
            <Text style={styles.devButtonText}>{t('settings.forceSyncNow')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  warningCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
  },
  warningContent: {
    flex: 1,
    gap: 4,
  },
  warningTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#991B1B',
  },
  warningDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#B91C1C',
    lineHeight: 16,
  },
  warningButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignSelf: 'flex-start',
    marginTop: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  warningButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E4DE',
    gap: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#1A1A1A',
  },
  sectionDesc: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#6B6560',
    marginTop: 2,
    lineHeight: 16,
  },
  subHeading: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#6B6560',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderCurve: 'continuous',
    backgroundColor: '#EFECE7',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
  },
  toggleButtonActive: {
    backgroundColor: '#0A1F17',
  },
  toggleText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#6B6560',
  },
  toggleTextActive: {
    color: '#F5F3EF',
  },
  itemsList: {
    gap: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
  },
  itemLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: '#1A1A1A',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  statusLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#6B6560',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusTextOk: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#047857',
  },
  statusTextWarn: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#DC2626',
  },
  openAlarmButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  openAlarmButtonText: {
    color: '#991B1B',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFECE7',
    minHeight: 44,
  },
  linkRowText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  infoText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#6B6560',
    flex: 1,
    lineHeight: 16,
  },
  mapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    minHeight: 44,
  },
  mapsButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#047857',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  versionText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#9C9590',
  },
  copyrightText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: '#9C9590',
  },
  devCard: {
    backgroundColor: '#FFFDF5',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    gap: 12,
  },
  devTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#92400E',
  },
  devButton: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  devButtonText: {
    color: '#78350F',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
});
