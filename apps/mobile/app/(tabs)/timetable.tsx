import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';
import { getCachedSchedule } from '../../src/services/storage';
import { performSync } from '../../src/services/sync';
import { PrayerSchedule } from '../../src/types';

export default function TimetableScreen() {
  const { t } = useTranslation();
  const [schedule, setSchedule] = useState<PrayerSchedule[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1); // 1-12

  const loadSchedule = async (force = false) => {
    if (force) setRefreshing(true);
    if (force) {
      const res = await performSync(true);
      setSchedule(res.schedule);
    } else {
      const cached = await getCachedSchedule();
      setSchedule(cached);
    }
    if (force) setRefreshing(false);
  };

  useEffect(() => {
    loadSchedule(false);
  }, []);

  const todayDateStr = useMemo(() => {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const monthRows = useMemo(() => {
    const padM = String(viewMonth).padStart(2, '0');
    const prefix = `${viewYear}-${padM}-`;
    return schedule
      .filter((s) => s.date.startsWith(prefix))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [schedule, viewYear, viewMonth]);

  const monthLabel = useMemo(() => {
    return new Date(viewYear, viewMonth - 1).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewYear(viewYear - 1);
      setViewMonth(12);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewYear(viewYear + 1);
      setViewMonth(1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadSchedule(true)}
          colors={['#047857']}
          tintColor="#047857"
        />
      }
    >
      <View style={styles.selectorCard}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={prevMonth}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
          <ChevronLeft color="#1A1A1A" size={20} />
        </TouchableOpacity>

        <Text style={styles.monthTitle}>{monthLabel}</Text>

        <TouchableOpacity
          style={styles.navButton}
          onPress={nextMonth}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
          <ChevronRight color="#1A1A1A" size={20} />
        </TouchableOpacity>
      </View>

      {monthRows.length > 0 ? (
        <View style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.headerCell, { flex: 1.2 }]}>{t('timetable.date')}</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Fajr</Text>
            <Text style={[styles.headerCell, { flex: 1.1 }]}>Dhuhr/Jum</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Asr</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Maghrib</Text>
            <Text style={[styles.headerCell, { flex: 1 }]}>Isha</Text>
          </View>

          {monthRows.map((row) => {
            const isToday = row.date === todayDateStr;
            const [y, m, d] = row.date.split('-').map(Number);
            const dateObj = new Date(Date.UTC(y, m - 1, d));
            const isFriday = dateObj.getUTCDay() === 5;
            const dayNum = row.date.slice(8);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' });

            return (
              <View
                key={row.date}
                style={[
                  styles.tableRow,
                  isToday && styles.rowToday,
                  isFriday && !isToday && styles.rowFriday,
                ]}
              >
                <View style={[styles.cellDate, { flex: 1.2 }]}>
                  <Text style={[styles.cellDateText, isToday && styles.textToday]}>
                    {dayNum} {dayName}
                  </Text>
                  {isToday && <View style={styles.todayDot} />}
                </View>

                <View style={[styles.cellTime, { flex: 1 }]}>
                  <Text style={styles.timeIqamah}>{row.fajr_iqamah.slice(0, 5)}</Text>
                  <Text style={styles.timeAzan}>{row.fajr_azan.slice(0, 5)}</Text>
                </View>

                <View style={[styles.cellTime, { flex: 1.1 }]}>
                  {isFriday && row.jummah_iqamah ? (
                    <>
                      <Text style={[styles.timeIqamah, styles.textJummah]}>
                        {row.jummah_iqamah.slice(0, 5)}
                      </Text>
                      <Text style={styles.timeAzan}>
                        {(row.jummah_azan || row.dhuhr_azan).slice(0, 5)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.timeIqamah}>{row.dhuhr_iqamah.slice(0, 5)}</Text>
                      <Text style={styles.timeAzan}>{row.dhuhr_azan.slice(0, 5)}</Text>
                    </>
                  )}
                </View>

                <View style={[styles.cellTime, { flex: 1 }]}>
                  <Text style={styles.timeIqamah}>{row.asr_iqamah.slice(0, 5)}</Text>
                  <Text style={styles.timeAzan}>{row.asr_azan.slice(0, 5)}</Text>
                </View>

                <View style={[styles.cellTime, { flex: 1 }]}>
                  <Text style={styles.timeIqamah}>{row.maghrib_iqamah.slice(0, 5)}</Text>
                  <Text style={styles.timeAzan}>{row.maghrib_azan.slice(0, 5)}</Text>
                </View>

                <View style={[styles.cellTime, { flex: 1 }]}>
                  <Text style={styles.timeIqamah}>{row.isha_iqamah.slice(0, 5)}</Text>
                  <Text style={styles.timeAzan}>{row.isha_azan.slice(0, 5)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Calendar color="#9C9590" size={32} />
          <Text style={styles.emptyTitle}>{t('timetable.noScheduleForDate')}</Text>
          <Text style={styles.emptySubtitle}>
            Timetable for {monthLabel} has not yet been published by the masjid committee.
          </Text>
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
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  selectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E8E4DE',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  navButton: {
    padding: 12,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#1A1A1A',
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E4DE',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  tableHeaderRow: {
    backgroundColor: '#0A1F17',
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerCell: {
    color: '#F5F3EF',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE7',
  },
  rowToday: {
    backgroundColor: '#F0F9F5',
  },
  rowFriday: {
    backgroundColor: '#FFFDF5',
  },
  cellDate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  cellDateText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    fontVariant: ['tabular-nums'],
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#047857',
  },
  textToday: {
    color: '#047857',
    fontFamily: 'Inter_700Bold',
  },
  cellTime: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  timeIqamah: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: '#1A1A1A',
    fontVariant: ['tabular-nums'],
  },
  textJummah: {
    color: '#B45309',
  },
  timeAzan: {
    fontSize: 10,
    color: '#6B6560',
    fontFamily: 'Inter_500Medium',
    fontVariant: ['tabular-nums'],
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderCurve: 'continuous',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E4DE',
    gap: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#6B6560',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
});
