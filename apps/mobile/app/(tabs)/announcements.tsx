import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Calendar, User, ChevronRight, Bell, AlertCircle } from 'lucide-react-native';
import { getCachedAnnouncements } from '../../src/services/storage';
import { performSync } from '../../src/services/sync';
import { Announcement } from '../../src/types';

export default function AnnouncementsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const currentLang = (i18n.language === 'ta' ? 'ta' : 'en') as 'en' | 'ta';

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadAnnouncements = async (force = false) => {
    if (force) setRefreshing(true);
    if (force) {
      const res = await performSync(true);
      setAnnouncements(res.announcements);
    } else {
      const cached = await getCachedAnnouncements();
      setAnnouncements(cached);
    }
    if (force) setRefreshing(false);
  };

  useEffect(() => {
    loadAnnouncements(false);
  }, []);

  const categories = [
    { key: 'all', label: t('announcements.all') },
    { key: 'schedule_change', label: t('announcements.scheduleChange') },
    { key: 'bayan', label: t('announcements.bayan') },
    { key: 'community', label: t('announcements.community') },
    { key: 'general', label: t('announcements.general') },
    { key: 'ramadan', label: t('announcements.ramadan') },
    { key: 'janazah', label: t('announcements.janazah') },
  ];

  const filteredAnnouncements = useMemo(() => {
    if (selectedCategory === 'all') return announcements;
    return announcements.filter((a) => a.category === selectedCategory);
  }, [announcements, selectedCategory]);

  return (
    <View style={styles.container}>
      <View style={styles.chipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContainer}
        >
          {categories.map((c) => {
            const isSelected = selectedCategory === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                onPress={() => setSelectedCategory(c.key)}
                style={[styles.chip, isSelected && styles.chipSelected]}
                accessibilityRole="button"
                accessibilityLabel={c.label}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAnnouncements(true)}
            colors={['#047857']}
            tintColor="#047857"
          />
        }
      >
        {filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map((ann) => {
            const title =
              currentLang === 'ta'
                ? ann.title_ta || ann.title_en || ''
                : ann.title_en || ann.title_ta || '';
            const body =
              currentLang === 'ta'
                ? ann.body_ta || ann.body_en || ''
                : ann.body_en || ann.body_ta || '';

            return (
              <TouchableOpacity
                key={ann.id}
                style={[styles.card, ann.is_urgent && styles.cardUrgent]}
                onPress={() => router.push(`/announcements/${ann.id}`)}
                accessibilityRole="button"
                accessibilityLabel={title}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.headerBadges}>
                    <Text style={styles.categoryBadge}>
                      {ann.category.replace('_', ' ')}
                    </Text>
                    {ann.is_urgent && (
                      <View style={styles.urgentBadge}>
                        <AlertCircle color="#92400E" size={12} />
                        <Text style={styles.urgentText}>{t('announcements.urgent')}</Text>
                      </View>
                    )}
                  </View>

                  {ann.published_at && (
                    <Text style={styles.dateText}>
                      {new Date(ann.published_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                <Text style={styles.titleText}>{title}</Text>
                <Text style={styles.bodyText} numberOfLines={2}>
                  {body}
                </Text>

                <View style={styles.cardFooter}>
                  <View style={styles.footerLeft}>
                    {ann.speaker_name && (
                      <View style={styles.metaRow}>
                        <User color="#047857" size={12} />
                        <Text style={styles.metaText}>{ann.speaker_name}</Text>
                      </View>
                    )}
                    {ann.event_at && (
                      <View style={styles.metaRow}>
                        <Calendar color="#047857" size={12} />
                        <Text style={styles.metaText}>
                          {new Date(ann.event_at).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <ChevronRight color="#9C9590" size={18} />
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <Bell color="#9C9590" size={32} />
            <Text style={styles.emptyText}>{t('announcements.noAnnouncements')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  chipsWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E4DE',
    paddingVertical: 12,
  },
  chipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderCurve: 'continuous',
    backgroundColor: '#EFECE7',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipSelected: {
    backgroundColor: '#0A1F17',
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#6B6560',
  },
  chipTextSelected: {
    color: '#F5F3EF',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E4DE',
    gap: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  cardUrgent: {
    borderColor: '#F59E0B',
    borderLeftWidth: 3,
    backgroundColor: '#FFFDF5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryBadge: {
    backgroundColor: '#EFECE7',
    color: '#6B6560',
    fontSize: 10,
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
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderCurve: 'continuous',
  },
  urgentText: {
    color: '#92400E',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 11,
    color: '#9C9590',
    fontFamily: 'Inter_500Medium',
  },
  titleText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#1A1A1A',
    lineHeight: 20,
  },
  bodyText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#6B6560',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EFECE7',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#047857',
    fontFamily: 'Inter_600SemiBold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: '#9C9590',
    fontFamily: 'Inter_500Medium',
  },
});
