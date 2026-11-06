import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import * as Application from 'expo-application';
import { useTranslation } from 'react-i18next';
import { fromZonedTime } from 'date-fns-tz';
import {
  AlertTriangle,
  AlertCircle,
  Download,
  WifiOff,
  MapPin,
  RefreshCw,
  ExternalLink,
} from 'lucide-react-native';
import {
  getCachedSettings,
  getCachedSchedule,
  getCachedAnnouncements,
  getLastSyncedAt,
} from '../../src/services/storage';
import { performSync } from '../../src/services/sync';
import { formatTimeDisplay } from '../../src/services/notificationPlan';
import { MasjidSettings, PrayerSchedule, Announcement } from '../../src/types';

interface NextEventInfo {
  prayerKey: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  type: 'azan' | 'iqamah' | 'sunrise';
  nameEn: string;
  nameTa: string;
  nameAr: string;
  timeStr: string;
  instant: Date;
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language === 'ta' ? 'ta' : 'en') as 'en' | 'ta';

  const [settings, setSettings] = useState<MasjidSettings | null>(null);
  const [schedule, setSchedule] = useState<PrayerSchedule[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissUpdate, setDismissUpdate] = useState(false);
  const [now, setNow] = useState(new Date());

  const installedVersion = Application.nativeApplicationVersion || '1.0.0';

  const loadData = useCallback(async (force = false) => {
    if (force) setRefreshing(true);
    const result = await performSync(force);
    setSettings(result.settings);
    setSchedule(result.schedule);
    setAnnouncements(result.announcements);
    setIsOffline(result.isOffline);
    setLastSyncedAt(result.lastSyncedAt);
    if (force) setRefreshing(false);
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Tick clock every second for countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format today's date in YYYY-MM-DD
  const todayDateStr = useMemo(() => {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [now]);

  const todaySchedule = useMemo(() => {
    return schedule.find((s) => s.date === todayDateStr) || null;
  }, [schedule, todayDateStr]);

  // Check remaining days in cached schedule
  const futureDaysCount = useMemo(() => {
    return schedule.filter((s) => s.date >= todayDateStr).length;
  }, [schedule, todayDateStr]);

  const timezone = settings?.timezone || 'Asia/Kolkata';

  // Determine Next Prayer / Event
  const nextEvent = useMemo<NextEventInfo | null>(() => {
    if (!todaySchedule) return null;

    const [y, m, d] = todayDateStr.split('-').map(Number);
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    const isFriday = dateObj.getUTCDay() === 5;

    const events: NextEventInfo[] = [
      {
        prayerKey: 'fajr',
        type: 'azan',
        nameEn: 'Fajr Azan',
        nameTa: 'ஃபஜ்ர் பாங்கு',
        nameAr: 'أَذَانُ الْفَجْر',
        timeStr: todaySchedule.fajr_azan,
        instant: fromZonedTime(`${todayDateStr} ${todaySchedule.fajr_azan}`, timezone),
      },
      {
        prayerKey: 'fajr',
        type: 'iqamah',
        nameEn: 'Fajr Iqamah',
        nameTa: 'ஃபஜ்ர் இகாமத்',
        nameAr: 'إِقَامَةُ الْفَجْر',
        timeStr: todaySchedule.fajr_iqamah,
        instant: fromZonedTime(`${todayDateStr} ${todaySchedule.fajr_iqamah}`, timezone),
      },
    ];

    if (todaySchedule.sunrise) {
      events.push({
        prayerKey: 'sunrise',
        type: 'sunrise',
        nameEn: 'Sunrise',
        nameTa: 'சூரிய உதயம்',
        nameAr: 'الشُّرُوق',
        timeStr: todaySchedule.sunrise,
        instant: fromZonedTime(`${todayDateStr} ${todaySchedule.sunrise}`, timezone),
      });
    }

    if (isFriday && todaySchedule.jummah_iqamah) {
      events.push(
        {
          prayerKey: 'dhuhr',
          type: 'azan',
          nameEn: "Jumu'ah Azan",
          nameTa: 'ஜும்ஆ பாங்கு',
          nameAr: 'أَذَانُ الْجُمُعَة',
          timeStr: todaySchedule.jummah_azan || todaySchedule.dhuhr_azan,
          instant: fromZonedTime(
            `${todayDateStr} ${todaySchedule.jummah_azan || todaySchedule.dhuhr_azan}`,
            timezone
          ),
        },
        {
          prayerKey: 'dhuhr',
          type: 'iqamah',
          nameEn: "Jumu'ah Iqamah",
          nameTa: 'ஜும்ஆ இகாமத்',
          nameAr: 'إِقَامَةُ الْجُمُعَة',
          timeStr: todaySchedule.jummah_iqamah,
          instant: fromZonedTime(`${todayDateStr} ${todaySchedule.jummah_iqamah}`, timezone),
        }
      );
    } else {
      events.push(
        {
          prayerKey: 'dhuhr',
          type: 'azan',
          nameEn: 'Dhuhr Azan',
          nameTa: 'ளுஹர் பாங்கு',
          nameAr: 'أَذَانُ الظُّهْر',
          timeStr: todaySchedule.dhuhr_azan,
          instant: fromZonedTime(`${todayDateStr} ${todaySchedule.dhuhr_azan}`, timezone),
        },
        {
          prayerKey: 'dhuhr',
          type: 'iqamah',
          nameEn: 'Dhuhr Iqamah',
          nameTa: 'ளுஹர் இகாமத்',
          nameAr: 'إِقَامَةُ الظُّهْر',
          timeStr: todaySchedule.dhuhr_iqamah,
          instant: fromZonedTime(`${todayDateStr} ${todaySchedule.dhuhr_iqamah}`, timezone),
        }
      );
    }

    events.push(
      {
        prayerKey: 'asr',
        type: 'azan',
        nameEn: 'Asr Azan',
        nameTa: 'அஸர் பாங்கு',
        nameAr: 'أَذَانُ الْعَصْر',
        timeStr: todaySchedule.asr_azan,
        instant: fromZonedTime(`${todayDateStr} ${todaySchedule.asr_azan}`, timezone),
      },
      {
        prayerKey: 'asr',
        type: 'iqamah',
        nameEn: 'Asr Iqamah',
        nameTa: 'அஸர் இகாமத்',
        nameAr: 'إِقَامَةُ الْعَصْر',
        timeStr: todaySchedule.asr_iqamah,
        instant: fromZonedTime(`${todayDateStr} ${todaySchedule.asr_iqamah}`, timezone),
      },
      {
        prayerKey: 'maghrib',
        type: 'azan',
        nameEn: 'Maghrib Azan',
        nameTa: 'மஃரிப் பாங்கு',
        nameAr: 'أَذَانُ الْمَغْرِب',
        timeStr: todaySchedule.maghrib_azan,
        instant: fromZonedTime(`${todayDateStr} ${todaySchedule.maghrib_azan}`, timezone),
      },
      {
        prayerKey: 'maghrib',
        type: 'iqamah',
        nameEn: 'Maghrib Iqamah',
        nameTa: 'மஃரிப் இகாமத்',
        nameAr: 'إِقَامَةُ الْمَغْرِب',
        timeStr: todaySchedule.maghrib_iqamah,
        instant: fromZonedTime(`${todayDateStr} ${todaySchedule.maghrib_iqamah}`, timezone),
      },
      {
        prayerKey: 'isha',
        type: 'azan',
        nameEn: 'Isha Azan',
        nameTa: 'இஷா பாங்கு',
        nameAr: 'أَذَانُ الْعِشَاء',
        timeStr: todaySchedule.isha_azan,
        instant: fromZonedTime(`${todayDateStr} ${todaySchedule.isha_azan}`, timezone),
      },
      {
        prayerKey: 'isha',
        type: 'iqamah',
        nameEn: 'Isha Iqamah',
        nameTa: 'இஷா இகாமத்',
        nameAr: 'إِقَامَةُ الْعِشَاء',
        timeStr: todaySchedule.isha_iqamah,
        instant: fromZonedTime(`${todayDateStr} ${todaySchedule.isha_iqamah}`, timezone),
      }
    );

    const upcoming = events.find((ev) => ev.instant.getTime() > now.getTime());
    return upcoming || null;
  }, [todaySchedule, todayDateStr, timezone, now]);

  // Compute countdown string
  const countdownText = useMemo(() => {
    if (!nextEvent) return '--:--:--';
    const diffMs = nextEvent.instant.getTime() - now.getTime();
    if (diffMs <= 0) return '00:00:00';

    const totalSec = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [nextEvent, now]);

  const urgentAnnouncement = announcements.find((a) => a.is_urgent);

  // New version available check
  const isUpdateAvailable =
    !dismissUpdate &&
    settings?.latest_version &&
    settings.latest_version !== installedVersion &&
    settings.apk_url;

  const handleOpenApk = () => {
    if (settings?.apk_url) {
      Linking.openURL(settings.apk_url);
    }
  };

  const handleOpenMaps = () => {
    const url = settings?.maps_url || 'https://maps.app.goo.gl/wPgTiSDwAh24Xoa49';
    Linking.openURL(url);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
          colors={['#047857']}
          tintColor="#047857"
        />
      }
    >
      {/* 1. New Version Available Banner */}
      {isUpdateAvailable && (
        <View style={styles.updateBanner}>
          <View style={styles.updateBannerTextContainer}>
            <Download color="#ffffff" size={18} />
            <Text style={styles.updateBannerTitle}>
              {t('home.newVersionAvailable', { version: settings.latest_version })}
            </Text>
          </View>
          <View style={styles.updateBannerButtons}>
            <TouchableOpacity
              style={styles.updateActionButton}
              onPress={handleOpenApk}
              accessibilityRole="button"
            >
              <Text style={styles.updateActionText}>{t('home.updateApp')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => setDismissUpdate(true)}
            >
              <Text style={styles.dismissText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 2. Urgent Announcement Pinned Notice */}
      {urgentAnnouncement && (
        <View style={styles.urgentBanner}>
          <View style={styles.urgentHeader}>
            <AlertCircle color="#b45309" size={16} />
            <Text style={styles.urgentBadge}>{t('announcements.urgent')}</Text>
          </View>
          <Text style={styles.urgentTitle}>
            {currentLang === 'ta'
              ? urgentAnnouncement.title_ta || urgentAnnouncement.title_en
              : urgentAnnouncement.title_en || urgentAnnouncement.title_ta}
          </Text>
          <Text style={styles.urgentBody} numberOfLines={3}>
            {currentLang === 'ta'
              ? urgentAnnouncement.body_ta || urgentAnnouncement.body_en
              : urgentAnnouncement.body_en || urgentAnnouncement.body_ta}
          </Text>
        </View>
      )}

      {/* 3. Timetable Ends Soon Notice */}
      {futureDaysCount < 3 && (
        <View style={styles.warningNotice}>
          <AlertTriangle color="#dc2626" size={16} />
          <Text style={styles.warningNoticeText}>{t('home.timetableEndsSoon')}</Text>
        </View>
      )}

      {/* 4. Offline Indicator */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <WifiOff color="#047857" size={14} />
          <Text style={styles.offlineText}>{t('home.offlineNotice')}</Text>
        </View>
      )}

      {/* 5. Hero Card: Next Event & Live Countdown */}
      <View style={styles.heroCard}>
        <Text style={styles.heroArabic}>
          {nextEvent ? nextEvent.nameAr : settings?.name_ar || 'مَسْجِدُ الْإِحْسَانِ'}
        </Text>
        <Text style={styles.heroNextLabel}>
          {t('prayers.nextPrayer')} &bull;{' '}
          {nextEvent ? (currentLang === 'ta' ? nextEvent.nameTa : nextEvent.nameEn) : '--'}
        </Text>

        <Text style={styles.heroTime}>
          {nextEvent ? formatTimeDisplay(nextEvent.timeStr, '12h') : '--:--'}
        </Text>

        <View style={styles.countdownContainer}>
          <Text style={styles.countdownLabel}>{t('prayers.countdown')}</Text>
          <Text style={styles.countdownValue}>{countdownText}</Text>
        </View>
      </View>

      {/* 6. Today's Prayers Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('home.todayPrayers')}</Text>
        {todaySchedule?.sunrise && (
          <Text style={styles.sunriseText}>
            {t('prayers.sunrise')}: {todaySchedule.sunrise.slice(0, 5)}
          </Text>
        )}
      </View>

      {todaySchedule ? (
        <View style={styles.prayersList}>
          {/* Fajr */}
          <PrayerRow
            name={t('prayers.fajr')}
            azan={todaySchedule.fajr_azan}
            iqamah={todaySchedule.fajr_iqamah}
            isActive={nextEvent?.prayerKey === 'fajr'}
          />

          {/* Dhuhr / Jumu'ah */}
          <PrayerRow
            name={todaySchedule.jummah_iqamah ? t('prayers.jumuah') : t('prayers.dhuhr')}
            azan={todaySchedule.jummah_azan || todaySchedule.dhuhr_azan}
            iqamah={todaySchedule.jummah_iqamah || todaySchedule.dhuhr_iqamah}
            bayan={todaySchedule.jummah_bayan || undefined}
            isActive={nextEvent?.prayerKey === 'dhuhr'}
          />

          {/* Asr */}
          <PrayerRow
            name={t('prayers.asr')}
            azan={todaySchedule.asr_azan}
            iqamah={todaySchedule.asr_iqamah}
            isActive={nextEvent?.prayerKey === 'asr'}
          />

          {/* Maghrib */}
          <PrayerRow
            name={t('prayers.maghrib')}
            azan={todaySchedule.maghrib_azan}
            iqamah={todaySchedule.maghrib_iqamah}
            isActive={nextEvent?.prayerKey === 'maghrib'}
          />

          {/* Isha */}
          <PrayerRow
            name={t('prayers.isha')}
            azan={todaySchedule.isha_azan}
            iqamah={todaySchedule.isha_iqamah}
            isActive={nextEvent?.prayerKey === 'isha'}
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('timetable.noScheduleForDate')}</Text>
        </View>
      )}

      {/* 7. Masjid Quick Details & Maps Link */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <MapPin color="#047857" size={16} />
          <Text style={styles.addressText}>
            {settings?.address || 'Skylab Avenue, Sithalapakkam, Tambaram, Tamil Nadu 600045'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.mapsButton}
          onPress={handleOpenMaps}
          accessibilityRole="button"
          accessibilityLabel={t('home.openInMaps')}
        >
          <Text style={styles.mapsButtonText}>{t('home.openInMaps')}</Text>
          <ExternalLink color="#ffffff" size={14} />
        </TouchableOpacity>
      </View>

      {/* Footer Info: Last synced */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>
          {t('home.lastUpdated')}:{' '}
          {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : '--'}
        </Text>
      </View>
    </ScrollView>
  );
}

function PrayerRow({
  name,
  azan,
  iqamah,
  bayan,
  isActive,
}: {
  name: string;
  azan: string;
  iqamah: string;
  bayan?: string;
  isActive: boolean;
}) {
  return (
    <View style={[styles.prayerRow, isActive && styles.prayerRowActive]}>
      {isActive && <View style={styles.prayerActiveBar} />}
      <View style={styles.prayerLeft}>
        <Text style={[styles.prayerName, isActive && styles.prayerNameActive]}>{name}</Text>
        {bayan && <Text style={styles.prayerBayan}>Bayan: {bayan.slice(0, 5)}</Text>}
      </View>

      <View style={styles.prayerRight}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Azan</Text>
          <Text style={styles.azanTime}>{azan.slice(0, 5)}</Text>
        </View>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Iqamah</Text>
          <Text style={[styles.iqamahTime, isActive && styles.iqamahTimeActive]}>
            {iqamah.slice(0, 5)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  // Update Banner
  updateBanner: {
    backgroundColor: '#0A1F17',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  updateBannerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  updateBannerTitle: {
    color: '#F5F3EF',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  updateBannerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  updateActionButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderCurve: 'continuous',
    minHeight: 44,
    justifyContent: 'center',
  },
  updateActionText: {
    color: '#0A1F17',
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
  },
  dismissButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    color: '#5C8A78',
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  // Urgent Banner
  urgentBanner: {
    backgroundColor: '#FFFDF5',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderLeftWidth: 3,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    gap: 4,
  },
  urgentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urgentBadge: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderCurve: 'continuous',
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  urgentTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#1A1A1A',
    marginTop: 4,
  },
  urgentBody: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#6B6560',
    lineHeight: 18,
  },
  // Warning Notice
  warningNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    gap: 8,
  },
  warningNoticeText: {
    fontSize: 12,
    color: '#991B1B',
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  // Offline Banner
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEFBF4',
    padding: 12,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  offlineText: {
    fontSize: 12,
    color: '#047857',
    fontFamily: 'Inter_500Medium',
  },
  // Hero Card
  heroCard: {
    backgroundColor: '#0A1F17',
    borderRadius: 24,
    borderCurve: 'continuous',
    padding: 24,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#122E22',
    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
  },
  heroArabic: {
    color: '#f59e0b',
    fontSize: 22,
    fontFamily: 'NotoNaskhArabic_700Bold',
    textAlign: 'center',
  },
  heroNextLabel: {
    color: '#A7D5C4',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  heroTime: {
    color: '#F5F3EF',
    fontSize: 48,
    fontFamily: 'Inter_700Bold',
    fontVariant: ['tabular-nums'],
    marginTop: 4,
  },
  countdownContainer: {
    backgroundColor: '#122E22',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  countdownLabel: {
    color: '#5C8A78',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  countdownValue: {
    color: '#f59e0b',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    fontVariant: ['tabular-nums'],
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: '#1A1A1A',
  },
  sunriseText: {
    fontSize: 12,
    color: '#9C9590',
    fontFamily: 'Inter_500Medium',
    fontVariant: ['tabular-nums'],
  },
  // Prayer Rows
  prayersList: {
    gap: 8,
  },
  prayerRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E4DE',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    overflow: 'hidden',
  },
  prayerRowActive: {
    borderColor: '#047857',
    backgroundColor: '#F0F9F5',
  },
  prayerActiveBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#047857',
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  prayerLeft: {
    flex: 1,
  },
  prayerName: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#1A1A1A',
  },
  prayerNameActive: {
    color: '#047857',
  },
  prayerBayan: {
    fontSize: 11,
    color: '#b45309',
    fontFamily: 'Inter_600SemiBold',
    marginTop: 2,
  },
  prayerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  timeBlock: {
    alignItems: 'center',
    gap: 2,
  },
  timeLabel: {
    fontSize: 9,
    color: '#9C9590',
    textTransform: 'uppercase',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.5,
  },
  azanTime: {
    fontSize: 14,
    color: '#6B6560',
    fontFamily: 'Inter_500Medium',
    fontVariant: ['tabular-nums'],
  },
  iqamahTime: {
    fontSize: 17,
    color: '#1A1A1A',
    fontFamily: 'Inter_700Bold',
    fontVariant: ['tabular-nums'],
  },
  iqamahTimeActive: {
    color: '#047857',
  },
  // Empty State
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E4DE',
  },
  emptyText: {
    fontSize: 13,
    color: '#9C9590',
    fontFamily: 'Inter_500Medium',
  },
  // Info Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E8E4DE',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#6B6560',
    flex: 1,
    lineHeight: 18,
  },
  mapsButton: {
    backgroundColor: '#047857',
    borderRadius: 10,
    borderCurve: 'continuous',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
  },
  mapsButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  // Footer
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerText: {
    fontSize: 11,
    color: '#9C9590',
    fontFamily: 'Inter_400Regular',
  },
});
