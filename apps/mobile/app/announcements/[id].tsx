import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Share,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Calendar from 'expo-calendar';
import {
  Calendar as CalendarIcon,
  Share2,
  User,
  AlertCircle,
  Clock,
} from 'lucide-react-native';
import { getCachedAnnouncements } from '../../src/services/storage';
import { Announcement } from '../../src/types';

export default function AnnouncementDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language === 'ta' ? 'ta' : 'en') as 'en' | 'ta';

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [addingToCal, setAddingToCal] = useState(false);

  useEffect(() => {
    async function load() {
      const all = await getCachedAnnouncements();
      const found = all.find((a) => a.id === id);
      if (found) setAnnouncement(found);
    }
    load();
  }, [id]);

  if (!announcement) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading announcement...</Text>
      </View>
    );
  }

  const primaryTitle =
    currentLang === 'ta'
      ? announcement.title_ta || announcement.title_en || ''
      : announcement.title_en || announcement.title_ta || '';
  const primaryBody =
    currentLang === 'ta'
      ? announcement.body_ta || announcement.body_en || ''
      : announcement.body_en || announcement.body_ta || '';

  const secondaryTitle =
    currentLang === 'ta' ? announcement.title_en : announcement.title_ta;
  const secondaryBody =
    currentLang === 'ta' ? announcement.body_en : announcement.body_ta;

  const handleShare = async () => {
    try {
      const shareText = `${primaryTitle}\n\n${primaryBody}\n\n- Masjidul Ihsaan`;
      await Share.share({
        message: shareText,
        title: primaryTitle,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleAddToCalendar = async () => {
    if (!announcement.event_at) return;
    setAddingToCal(true);

    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', t('announcements.calendarPermissionRequired'));
        setAddingToCal(false);
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const writableCal =
        calendars.find((c) => c.isPrimary) ||
        calendars.find((c) => c.allowsModifications) ||
        calendars[0];

      if (!writableCal) {
        Alert.alert('Error', 'No writable calendar found on device');
        setAddingToCal(false);
        return;
      }

      const startDate = new Date(announcement.event_at);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

      await Calendar.createEventAsync(writableCal.id, {
        title: primaryTitle,
        notes: primaryBody,
        startDate,
        endDate,
        location: 'Masjidul Ihsaan, Sithalapakkam',
      });

      Alert.alert('Success', t('announcements.calendarSuccess'));
    } catch (err: any) {
      Alert.alert('Calendar Error', err.message || 'Failed to save event');
    } finally {
      setAddingToCal(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {announcement.banner_url && (
        <Image
          source={{ uri: announcement.banner_url }}
          style={styles.bannerImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.metaHeader}>
        <View style={styles.badgeRow}>
          <Text style={styles.categoryBadge}>
            {announcement.category.replace('_', ' ')}
          </Text>
          {announcement.is_urgent && (
            <View style={styles.urgentBadge}>
              <AlertCircle color="#92400E" size={14} />
              <Text style={styles.urgentText}>{t('announcements.urgent')}</Text>
            </View>
          )}
        </View>

        {announcement.published_at && (
          <Text style={styles.publishedDate}>
            {new Date(announcement.published_at).toLocaleDateString()}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.primaryTitle}>{primaryTitle}</Text>
        <Text style={styles.primaryBody}>{primaryBody}</Text>
      </View>

      {secondaryTitle && secondaryBody && (
        <View style={styles.secondaryCard}>
          <Text style={styles.secondaryHeader}>
            {currentLang === 'ta' ? 'English Translation' : 'தமிழ் வடிவம்'}
          </Text>
          <Text style={styles.secondaryTitle}>{secondaryTitle}</Text>
          <Text style={styles.secondaryBody}>{secondaryBody}</Text>
        </View>
      )}

      <View style={styles.infoBox}>
        {announcement.speaker_name && (
          <View style={styles.infoRow}>
            <User color="#047857" size={16} />
            <Text style={styles.infoText}>
              {t('announcements.speaker')}: {announcement.speaker_name}
            </Text>
          </View>
        )}

        {announcement.event_at && (
          <View style={styles.infoRow}>
            <Clock color="#047857" size={16} />
            <Text style={styles.infoText}>
              {t('announcements.eventAt')}:{' '}
              {new Date(announcement.event_at).toLocaleString()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actionsContainer}>
        {announcement.event_at && (
          <TouchableOpacity
            style={styles.actionButtonPrimary}
            onPress={handleAddToCalendar}
            disabled={addingToCal}
            accessibilityRole="button"
            accessibilityLabel={t('announcements.addToCalendar')}
          >
            <CalendarIcon color="#FFFFFF" size={18} />
            <Text style={styles.actionButtonText}>
              {addingToCal ? 'Adding...' : t('announcements.addToCalendar')}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionButtonSecondary}
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel={t('announcements.share')}
        >
          <Share2 color="#047857" size={18} />
          <Text style={styles.actionButtonSecondaryText}>
            {t('announcements.share')}
          </Text>
        </TouchableOpacity>
      </View>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3EF',
  },
  loadingText: {
    fontSize: 13,
    color: '#9C9590',
    fontFamily: 'Inter_500Medium',
  },
  bannerImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    borderCurve: 'continuous',
    backgroundColor: '#0A1F17',
  },
  metaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#EFECE7',
    color: '#6B6560',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderCurve: 'continuous',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderCurve: 'continuous',
  },
  urgentText: {
    color: '#92400E',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
  },
  publishedDate: {
    fontSize: 12,
    color: '#9C9590',
    fontFamily: 'Inter_500Medium',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8E4DE',
    gap: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  primaryTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: '#1A1A1A',
    lineHeight: 24,
  },
  primaryBody: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#6B6560',
    lineHeight: 22,
  },
  secondaryCard: {
    backgroundColor: '#EFECE7',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    gap: 6,
  },
  secondaryHeader: {
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    color: '#9C9590',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  secondaryTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#1A1A1A',
  },
  secondaryBody: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#6B6560',
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E8E4DE',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: '#1A1A1A',
  },
  actionsContainer: {
    gap: 12,
  },
  actionButtonPrimary: {
    backgroundColor: '#047857',
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
  actionButtonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#047857',
    borderRadius: 999,
    borderCurve: 'continuous',
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
  },
  actionButtonSecondaryText: {
    color: '#047857',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
});
