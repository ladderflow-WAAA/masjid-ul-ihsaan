import React from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import AdminNav from '@/components/AdminNav';
import { PrayerSchedule, Announcement, MasjidSettings } from '@/lib/types';
import {
  fallbackSettings,
  generatePrayerSchedule,
  fallbackAnnouncements,
} from '@/lib/mockData';
import {
  categoryLabel,
  formatDateLong,
  formatDateShort,
  formatTime,
  formatWeekdayLong,
} from '@/lib/display';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function Fact({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[14px] font-semibold text-app-text tabular-nums">
        {value}
      </span>
      <span className="text-[12.5px] text-app-secondary">{label}</span>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const todayDateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  let settings: MasjidSettings | null = null;
  let todaySchedule: PrayerSchedule | null = null;
  let coverageDays = 0;
  let lastPublishedDate: string | null = null;
  let deviceCount = 0;
  let publishedNotices = 0;
  let draftNotices = 0;
  let urgentNotices = 0;
  let announcements: Announcement[] = [];

  try {
    const [
      settingsRes,
      todayRes,
      futureDatesRes,
      devicesRes,
      announcementsRes,
      publishedCountRes,
      draftCountRes,
      urgentCountRes,
      lastDateRes,
    ] = await Promise.all([
      supabase.from('masjid_settings').select('*').eq('id', 1).maybeSingle(),
      supabase.from('prayer_schedule').select('*').eq('date', todayDateStr).maybeSingle(),
      supabase
        .from('prayer_schedule')
        .select('date', { count: 'exact', head: true })
        .gte('date', todayDateStr),
      supabase.from('devices').select('expo_push_token', { count: 'exact', head: true }),
      supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4),
      supabase
        .from('announcements')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true),
      supabase
        .from('announcements')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', false),
      supabase
        .from('announcements')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true)
        .eq('is_urgent', true),
      supabase
        .from('prayer_schedule')
        .select('date')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    settings = settingsRes.data || null;
    todaySchedule = todayRes.data || null;
    coverageDays = futureDatesRes.count || 0;
    deviceCount = devicesRes.count || 0;
    announcements = announcementsRes.data || [];
    publishedNotices = publishedCountRes.count || 0;
    draftNotices = draftCountRes.count || 0;
    urgentNotices = urgentCountRes.count || 0;
    lastPublishedDate = lastDateRes.data?.date ?? null;
  } catch {
    // Database connection or query failed - fall through to fallbacks below
  }

  // Fallbacks keep the page renderable while the database is being set up.
  if (!settings) settings = fallbackSettings;
  if (!todaySchedule) todaySchedule = generatePrayerSchedule(todayDateStr);
  if (!announcements.length) announcements = fallbackAnnouncements;

  const isLowCoverage = coverageDays < 7;
  const isFriday = Boolean(todaySchedule?.jummah_iqamah);

  const rows = todaySchedule
    ? [
        {
          key: 'fajr',
          label: 'Fajr',
          azan: formatTime(todaySchedule.fajr_azan),
          iqamah: formatTime(todaySchedule.fajr_iqamah),
        },
        {
          key: 'sunrise',
          label: 'Sunrise',
          azan: formatTime(todaySchedule.sunrise),
          iqamah: '—',
          muted: true,
        },
        {
          key: 'jummah',
          label: isFriday ? "Jumu'ah" : 'Dhuhr',
          azan: formatTime(
            isFriday ? todaySchedule.jummah_azan : todaySchedule.dhuhr_azan,
          ),
          iqamah: formatTime(
            isFriday ? todaySchedule.jummah_iqamah : todaySchedule.dhuhr_iqamah,
          ),
          note:
            isFriday && todaySchedule.jummah_bayan
              ? `Bayan ${formatTime(todaySchedule.jummah_bayan)}`
              : undefined,
        },
        {
          key: 'asr',
          label: 'Asr',
          azan: formatTime(todaySchedule.asr_azan),
          iqamah: formatTime(todaySchedule.asr_iqamah),
        },
        {
          key: 'maghrib',
          label: 'Maghrib',
          azan: formatTime(todaySchedule.maghrib_azan),
          iqamah: formatTime(todaySchedule.maghrib_iqamah),
        },
        {
          key: 'isha',
          label: 'Isha',
          azan: formatTime(todaySchedule.isha_azan),
          iqamah: formatTime(todaySchedule.isha_iqamah),
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-app-bg text-app-text flex flex-col">
      <AdminNav />

      <main className="flex-1 w-full px-6 py-6">
        {/* Title */}
        <div className="flex items-end justify-between gap-6 reveal">
          <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em]">
            Dashboard
          </h1>
          <p className="text-[13px] text-app-secondary tabular-nums">
            {formatWeekdayLong(todayDateStr)}
          </p>
        </div>

        {/* Coverage */}
        <section className="mt-4 rounded-panel border border-app-border bg-app-surface shadow-panel px-5 h-20 flex items-center justify-between gap-6 reveal reveal-1">
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-app-secondary">
              Timetable coverage
            </p>
            <div className="mt-1 flex items-baseline gap-2.5 flex-wrap">
              <span className="text-[22px] leading-7 font-semibold tabular-nums">
                {coverageDays} {coverageDays === 1 ? 'day' : 'days'} ahead
              </span>
              <span className="inline-flex items-center gap-1.5 text-[13px] text-app-secondary">
                <span
                  aria-hidden="true"
                  className={`w-1.5 h-1.5 rounded-full ${
                    isLowCoverage ? 'bg-app-danger' : 'bg-app-accent'
                  }`}
                />
                {lastPublishedDate
                  ? `Published to ${formatDateLong(lastPublishedDate)}`
                  : 'No future dates published'}
              </span>
            </div>
          </div>

          <Link
            href="/timetable"
            className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-field border border-app-border text-[13px] font-medium text-app-text hover:bg-app-bg hover:border-app-secondary/30 transition-colors duration-200"
          >
            Edit timetable
            <ArrowRight className="w-3.5 h-3.5 text-app-secondary" aria-hidden="true" />
          </Link>
        </section>

        {/* Low coverage warning */}
        {isLowCoverage && (
          <div
            role="status"
            className="mt-3 rounded-panel border border-app-dangerBorder bg-app-dangerTint px-5 py-3.5 flex items-center justify-between gap-4 reveal reveal-1"
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <AlertTriangle
                className="w-4 h-4 text-app-danger shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <p className="text-[13px] leading-5 text-[#991B1B]">
                {coverageDays === 0
                  ? 'No future dates are published. Members will not receive prayer reminders.'
                  : `Timetable ends in ${coverageDays} ${
                      coverageDays === 1 ? 'day' : 'days'
                    }. Members will not receive prayer reminders after that.`}
              </p>
            </div>
            <Link
              href="/timetable"
              className="shrink-0 text-[13px] font-semibold text-app-danger hover:underline"
            >
              Update timetable
            </Link>
          </div>
        )}

        {/* Factual strip */}
        <div className="mt-4 flex items-center gap-4 flex-wrap text-[13px] reveal reveal-2">
          <Fact value={deviceCount} label="push subscribers" />
          <span aria-hidden="true" className="w-px h-3.5 bg-app-border" />
          <Fact value={publishedNotices} label="published notices" />
          <span aria-hidden="true" className="w-px h-3.5 bg-app-border" />
          <Fact value={draftNotices} label={draftNotices === 1 ? 'draft' : 'drafts'} />
          <span aria-hidden="true" className="w-px h-3.5 bg-app-border" />
          <Fact value={urgentNotices} label="urgent notice" />
        </div>

        {/* Work area */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-5 items-start">
          {/* Today's prayer times */}
          <section className="rounded-panel border border-app-border bg-app-surface shadow-panel overflow-hidden reveal reveal-3">
            <header className="px-5 h-12 flex items-center justify-between border-b border-app-border">
              <h2 className="text-[15px] font-semibold">Today&apos;s prayer times</h2>
              <span className="text-[12.5px] text-app-secondary">
                {formatDateLong(todayDateStr)}
              </span>
            </header>

            {rows.length ? (
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.06em] text-app-tertiary">
                    <th className="h-9 px-5 text-left font-medium">Prayer</th>
                    <th className="h-9 px-3 text-right font-medium w-28">Azan</th>
                    <th className="h-9 px-5 text-right font-medium w-28">Iqamah</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.key}
                      className={`border-t border-app-hairline ${
                        row.note ? 'h-[52px] bg-app-accentTint' : 'h-9'
                      } ${row.muted ? 'text-app-tertiary' : ''}`}
                    >
                      <td className="px-5 py-0">
                        <span
                          className={`text-[13.5px] ${
                            row.muted ? 'font-normal' : 'font-medium'
                          } ${row.note ? 'text-app-primary font-semibold' : 'text-app-text'}`}
                        >
                          {row.label}
                        </span>
                        {row.note && (
                          <span className="block text-[11px] font-medium text-app-goldInk tabular-nums">
                            {row.note}
                          </span>
                        )}
                      </td>
                      <td className="px-3 text-right text-[13px] tabular-nums text-app-secondary">
                        {row.azan}
                      </td>
                      <td
                        className={`px-5 text-right text-[13px] tabular-nums ${
                          row.muted ? 'text-app-tertiary' : 'font-medium text-app-text'
                        }`}
                      >
                        {row.iqamah}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-5 py-8 text-[13px] text-app-secondary">
                No schedule record found for today.
              </p>
            )}

            <footer className="h-11 px-5 flex items-center border-t border-app-border">
              <Link
                href="/timetable"
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-app-primary hover:underline"
              >
                Edit timetable
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </footer>
          </section>

          {/* Recent announcements */}
          <section className="rounded-panel border border-app-border bg-app-surface shadow-panel overflow-hidden flex flex-col reveal reveal-4">
            <header className="px-5 h-12 flex items-center justify-between border-b border-app-border">
              <h2 className="text-[15px] font-semibold">Recent announcements</h2>
              <Link
                href="/announcements"
                className="text-[12.5px] font-medium text-app-primary hover:underline"
              >
                Manage all
              </Link>
            </header>

            <div className="flex-1">
              {announcements.length ? (
                announcements.slice(0, 4).map((ann) => {
                  const title = ann.title_en || ann.title_ta || 'Untitled';
                  const status = !ann.is_published
                    ? 'Draft'
                    : ann.push_sent_at
                      ? `Push ${formatDateShort(ann.push_sent_at)}`
                      : `Published ${formatDateShort(ann.published_at)}`;
                  return (
                    <Link
                      key={ann.id}
                      href="/announcements"
                      className="block px-5 py-4 border-t border-app-hairline first:border-t-0 hover:bg-app-bg/70 transition-colors duration-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold leading-5 truncate">
                            {title}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.06em] text-app-tertiary">
                            <span>{categoryLabel(ann.category)}</span>
                            {ann.is_urgent && (
                              <span className="inline-flex items-center gap-1 normal-case tracking-normal text-[11px] font-semibold text-app-goldInk">
                                <span
                                  aria-hidden="true"
                                  className="w-1.5 h-1.5 rounded-full bg-app-gold"
                                />
                                Urgent
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 text-[11px] text-app-tertiary whitespace-nowrap tabular-nums">
                          {status}
                        </span>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <p className="px-5 py-8 text-[13px] text-app-secondary">
                  No announcements published yet.
                </p>
              )}
            </div>

            <div className="p-4 border-t border-app-border">
              <Link
                href="/announcements"
                className="w-full h-10 inline-flex items-center justify-center rounded-field border border-app-border text-[13px] font-semibold text-app-text hover:bg-app-bg transition-colors duration-200"
              >
                New announcement
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
