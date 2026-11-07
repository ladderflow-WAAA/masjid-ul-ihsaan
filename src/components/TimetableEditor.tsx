'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PrayerSchedule } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { generateMonthSchedules } from '@/lib/mockData';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Download, SlidersHorizontal, X } from 'lucide-react';

interface TimetableEditorProps {
  initialYear: number;
  initialMonth: number; // 1-12
}

const PRAYER_PAIRS: { prefix: string; label: string }[] = [
  { prefix: 'fajr', label: 'Fajr' },
  { prefix: 'dhuhr', label: 'Dhuhr' },
  { prefix: 'asr', label: 'Asr' },
  { prefix: 'maghrib', label: 'Maghrib' },
  { prefix: 'isha', label: 'Isha' },
];

const inputClass =
  'w-full h-10 px-3 rounded-field bg-app-bg border border-app-border text-[13.5px] text-app-text placeholder:text-app-tertiary focus:outline-none focus:bg-app-surface focus:border-app-primary focus:ring-[3px] focus:ring-app-primary/15 transition-colors duration-100';

const labelCls = 'block text-[12px] font-medium text-[#5F5A55] text-app-secondary mb-1.5';

function TimeCell({
  value,
  onChange,
  disabled,
  tone,
  dirty,
  invalid,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  tone?: 'az' | 'iq';
  dirty?: boolean;
  invalid?: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <td className="px-1 text-center text-[13px] text-app-tertiary/60 tabular-nums">
        —
      </td>
    );
  }
  return (
    <td className="px-0.5">
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`cell-input ${tone ?? ''} ${dirty ? 'dirty' : ''} ${invalid ? 'invalid' : ''}`}
      />
    </td>
  );
}

export default function TimetableEditor({ initialYear, initialMonth }: TimetableEditorProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [rows, setRows] = useState<PrayerSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirtyCells, setDirtyCells] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const [showRangeModal, setShowRangeModal] = useState(false);
  const [bulkPrayer, setBulkPrayer] = useState<string>('isha');
  const [bulkField, setBulkField] = useState<'azan' | 'iqamah'>('iqamah');
  const [bulkStartDate, setBulkStartDate] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkTime, setBulkTime] = useState('20:15');

  const loadMonthSchedule = useCallback(async (y: number, m: number) => {
    const supabase = createClient();
    setLoading(true);
    setStatus(null);

    const padM = String(m).padStart(2, '0');
    const startStr = `${y}-${padM}-01`;
    const daysInMonth = new Date(y, m, 0).getDate();
    const endStr = `${y}-${padM}-${String(daysInMonth).padStart(2, '0')}`;

    try {
      const { data, error } = await supabase
        .from('prayer_schedule')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true });

      const existingMap = new Map<string, PrayerSchedule>();
      if (!error && data && data.length > 0) {
        data.forEach((row) => existingMap.set(row.date, row));
      }

      const fullList: PrayerSchedule[] = [];
      const generatedFallbacks = generateMonthSchedules(`${y}-${padM}-01`);
      const fallbackMap = new Map(generatedFallbacks.map((f) => [f.date, f]));

      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${y}-${padM}-${String(day).padStart(2, '0')}`;
        const existing = existingMap.get(dateStr) || fallbackMap.get(dateStr);
        const isFriday = new Date(y, m - 1, day).getDay() === 5;

        if (!existing) continue;

        fullList.push({
          ...existing,
          fajr_azan: existing.fajr_azan.slice(0, 5),
          fajr_iqamah: existing.fajr_iqamah.slice(0, 5),
          dhuhr_azan: existing.dhuhr_azan.slice(0, 5),
          dhuhr_iqamah: existing.dhuhr_iqamah.slice(0, 5),
          asr_azan: existing.asr_azan.slice(0, 5),
          asr_iqamah: existing.asr_iqamah.slice(0, 5),
          maghrib_azan: existing.maghrib_azan.slice(0, 5),
          maghrib_iqamah: existing.maghrib_iqamah.slice(0, 5),
          isha_azan: existing.isha_azan.slice(0, 5),
          isha_iqamah: existing.isha_iqamah.slice(0, 5),
          sunrise: existing.sunrise ? existing.sunrise.slice(0, 5) : null,
          jummah_azan: existing.jummah_azan
            ? existing.jummah_azan.slice(0, 5)
            : isFriday
              ? '12:30'
              : null,
          jummah_bayan: existing.jummah_bayan
            ? existing.jummah_bayan.slice(0, 5)
            : isFriday
              ? '12:45'
              : null,
          jummah_iqamah: existing.jummah_iqamah
            ? existing.jummah_iqamah.slice(0, 5)
            : isFriday
              ? '13:15'
              : null,
        });
      }

      setRows(fullList);
      setDirtyCells(new Set());
      setBulkStartDate(startStr);
      setBulkEndDate(endStr);
    } catch {
      const fullList = generateMonthSchedules(`${y}-${padM}-01`);
      setRows(fullList);
      setDirtyCells(new Set());
      setBulkStartDate(startStr);
      setBulkEndDate(endStr);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonthSchedule(year, month);
  }, [year, month, loadMonthSchedule]);

  const handleCellChange = (index: number, field: keyof PrayerSchedule, value: string) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value || null } as PrayerSchedule;
      return updated;
    });
    const date = rows[index]?.date;
    if (date) {
      setDirtyCells((prev) => new Set(prev).add(`${date}|${String(field)}`));
    }
  };

  /** Azan may never be later than Iqamah - the same rule the database enforces. */
  const violations = useMemo(() => {
    const list: { date: string; field: string; message: string }[] = [];
    const pairs = [
      ...PRAYER_PAIRS.map((p) => ({
        azan: `${p.prefix}_azan` as keyof PrayerSchedule,
        iqamah: `${p.prefix}_iqamah` as keyof PrayerSchedule,
        label: p.label,
      })),
      {
        azan: 'jummah_azan' as keyof PrayerSchedule,
        iqamah: 'jummah_iqamah' as keyof PrayerSchedule,
        label: "Jumu'ah",
      },
    ];

    rows.forEach((row) => {
      pairs.forEach(({ azan, iqamah, label }) => {
        const a = row[azan];
        const i = row[iqamah];
        if (typeof a === 'string' && typeof i === 'string' && a > i) {
          list.push({
            date: row.date,
            field: String(azan),
            message: `${label} Azan is after Iqamah`,
          });
        }
      });
    });
    return list;
  }, [rows]);

  const invalidKeys = useMemo(
    () => new Set(violations.map((v) => `${v.date}|${v.field}`)),
    [violations],
  );

  const handleSave = async () => {
    if (violations.length) {
      setStatus({ type: 'error', text: violations[0].message });
      return;
    }

    const supabase = createClient();
    setSaving(true);
    setStatus(null);

    const withSeconds = (v: string | null) =>
      v ? (v.length === 5 ? `${v}:00` : v) : null;

    const payload = rows.map((r) => ({
      date: r.date,
      fajr_azan: withSeconds(r.fajr_azan),
      fajr_iqamah: withSeconds(r.fajr_iqamah),
      sunrise: withSeconds(r.sunrise),
      dhuhr_azan: withSeconds(r.dhuhr_azan),
      dhuhr_iqamah: withSeconds(r.dhuhr_iqamah),
      asr_azan: withSeconds(r.asr_azan),
      asr_iqamah: withSeconds(r.asr_iqamah),
      maghrib_azan: withSeconds(r.maghrib_azan),
      maghrib_iqamah: withSeconds(r.maghrib_iqamah),
      isha_azan: withSeconds(r.isha_azan),
      isha_iqamah: withSeconds(r.isha_iqamah),
      jummah_azan: withSeconds(r.jummah_azan),
      jummah_bayan: withSeconds(r.jummah_bayan),
      jummah_iqamah: withSeconds(r.jummah_iqamah),
      note_en: r.note_en || null,
      note_ta: r.note_ta || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('prayer_schedule')
      .upsert(payload, { onConflict: 'date' });

    setSaving(false);

    if (error) {
      setStatus({ type: 'error', text: error.message });
      return;
    }

    setDirtyCells(new Set());
    setStatus({
      type: 'success',
      text: `Published ${rows.length} dates for ${monthLabel}.`,
    });
  };

  const handleApplyRange = () => {
    if (!bulkStartDate || !bulkEndDate || !bulkTime) {
      setStatus({ type: 'error', text: 'Start date, end date and time are required.' });
      return;
    }

    const fieldKey = (
      bulkPrayer === 'jummah' ? 'jummah_iqamah' : `${bulkPrayer}_${bulkField}`
    ) as keyof PrayerSchedule;

    const affected: string[] = [];

    setRows((prev) =>
      prev.map((r) => {
        if (r.date >= bulkStartDate && r.date <= bulkEndDate) {
          if (bulkPrayer === 'jummah' && new Date(`${r.date}T00:00:00`).getDay() !== 5) {
            return r;
          }
          affected.push(`${r.date}|${String(fieldKey)}`);
          return { ...r, [fieldKey]: bulkTime } as PrayerSchedule;
        }
        return r;
      }),
    );

    setDirtyCells((prev) => {
      const next = new Set(prev);
      affected.forEach((key) => next.add(key));
      return next;
    });

    setShowRangeModal(false);
    setStatus({
      type: 'success',
      text: `${affected.length} dates updated in the grid. Publish to commit.`,
    });
  };

  const handleExportCSV = () => {
    const headers = [
      'date',
      'fajr_azan',
      'fajr_iqamah',
      'sunrise',
      'dhuhr_azan',
      'dhuhr_iqamah',
      'asr_azan',
      'asr_iqamah',
      'maghrib_azan',
      'maghrib_iqamah',
      'isha_azan',
      'isha_iqamah',
      'jummah_azan',
      'jummah_bayan',
      'jummah_iqamah',
      'note_en',
      'note_ta',
    ];

    const lines = [headers.join(',')];
    rows.forEach((r) => {
      lines.push(
        [
          r.date,
          r.fajr_azan,
          r.fajr_iqamah,
          r.sunrise || '',
          r.dhuhr_azan,
          r.dhuhr_iqamah,
          r.asr_azan,
          r.asr_iqamah,
          r.maghrib_azan,
          r.maghrib_iqamah,
          r.isha_azan,
          r.isha_iqamah,
          r.jummah_azan || '',
          r.jummah_bayan || '',
          r.jummah_iqamah || '',
          `"${(r.note_en || '').replace(/"/g, '""')}"`,
          `"${(r.note_ta || '').replace(/"/g, '""')}"`,
        ].join(','),
      );
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `masjid-timetable-${year}-${String(month).padStart(2, '0')}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthLabel = new Date(year, month - 1).toLocaleString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  const prevMonthClick = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonthClick = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const isCellDirty = (date: string, field: keyof PrayerSchedule) =>
    dirtyCells.has(`${date}|${String(field)}`);

  const isCellInvalid = (date: string, field: keyof PrayerSchedule) =>
    invalidKeys.has(`${date}|${String(field)}`);

  return (
    <div className="space-y-4">
      {/* Save bar */}
      <div className="rounded-panel border border-app-border bg-app-surface shadow-panel h-14 px-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center rounded-field border border-app-border bg-app-bg">
            <button
              type="button"
              onClick={prevMonthClick}
              title="Previous month"
              aria-label="Previous month"
              className="w-8 h-8 flex items-center justify-center text-app-secondary hover:text-app-text rounded-l-[9px] hover:bg-app-surface transition-colors duration-200"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
            <span className="px-2 text-[13px] font-semibold whitespace-nowrap">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={nextMonthClick}
              title="Next month"
              aria-label="Next month"
              className="w-8 h-8 flex items-center justify-center text-app-secondary hover:text-app-text rounded-r-[9px] hover:bg-app-surface transition-colors duration-200"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {dirtyCells.size > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-app-secondary whitespace-nowrap">
              <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-app-gold" />
              {dirtyCells.size} unsaved {dirtyCells.size === 1 ? 'change' : 'changes'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-app-tertiary whitespace-nowrap">
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              All changes published
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowRangeModal(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-field border border-app-border text-[13px] font-medium text-app-text hover:bg-app-bg transition-colors duration-200"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-app-secondary" aria-hidden="true" />
            Apply to range
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-field border border-app-border text-[13px] font-medium text-app-text hover:bg-app-bg transition-colors duration-200"
          >
            <Download className="w-3.5 h-3.5 text-app-secondary" aria-hidden="true" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="h-9 px-4 rounded-field bg-app-primary text-white text-[13px] font-semibold hover:bg-app-primaryHover focus:outline-none focus:ring-[3px] focus:ring-app-primary/25 disabled:opacity-60 transition-colors duration-200"
          >
            {saving ? 'Publishing…' : 'Save & Publish'}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-panel border border-app-border bg-app-surface shadow-panel overflow-hidden">
        <div className="max-h-[560px] overflow-auto scroll-slim">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-20">
              <tr className="bg-app-surface">
                <th
                  rowSpan={2}
                  className="sticky left-0 z-30 bg-app-surface px-3 h-9 text-left text-[11px] uppercase tracking-[0.06em] text-app-tertiary font-medium border-b border-app-border align-middle"
                >
                  Date
                </th>
                {PRAYER_PAIRS.map((p) => (
                  <th
                    key={p.prefix}
                    colSpan={2}
                    className="h-8 px-1 text-center text-[11px] font-semibold text-app-secondary border-b border-l border-app-hairline first-of-type:border-l-0"
                  >
                    {p.label}
                  </th>
                ))}
                <th
                  rowSpan={2}
                  className="px-2 h-9 text-center text-[11px] font-semibold text-app-secondary border-b border-l border-app-border align-middle"
                >
                  Sunrise
                </th>
                <th
                  colSpan={3}
                  className="h-8 px-1 text-center text-[11px] font-semibold text-app-goldInk border-b border-l border-app-hairline bg-app-goldTint"
                >
                  Jumu&apos;ah
                </th>
              </tr>
              <tr className="bg-app-surface">
                {PRAYER_PAIRS.map((p) => (
                  <React.Fragment key={p.prefix}>
                    <th className="h-7 px-1 text-center text-[10.5px] uppercase tracking-[0.05em] font-medium text-app-tertiary border-b border-l border-app-hairline">
                      Azan
                    </th>
                    <th className="h-7 px-1 text-center text-[10.5px] uppercase tracking-[0.05em] font-medium text-app-tertiary border-b border-app-hairline">
                      Iqamah
                    </th>
                  </React.Fragment>
                ))}
                <th className="h-7 px-1 text-center text-[10.5px] uppercase tracking-[0.05em] font-medium text-app-tertiary border-b border-l border-app-hairline bg-app-goldTint">
                  Azan
                </th>
                <th className="h-7 px-1 text-center text-[10.5px] uppercase tracking-[0.05em] font-medium text-app-tertiary border-b border-app-hairline bg-app-goldTint">
                  Bayan
                </th>
                <th className="h-7 px-1 text-center text-[10.5px] uppercase tracking-[0.05em] font-medium text-app-tertiary border-b border-app-hairline bg-app-goldTint">
                  Iqamah
                </th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={15} className="px-4 py-10 text-center text-[13px] text-app-secondary">
                    Loading {monthLabel}…
                  </td>
                </tr>
              )}

              {!loading &&
                rows.map((row, idx) => {
                  const rowDate = new Date(`${row.date}T00:00:00`);
                  const isFriday = rowDate.getDay() === 5;
                  const isToday =
                    row.date ===
                    new Intl.DateTimeFormat('en-CA', {
                      timeZone: 'Asia/Kolkata',
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    }).format(new Date());

                  return (
                    <tr
                      key={row.date}
                      className={`h-9 border-t border-app-hairline transition-colors duration-100 ${
                        isToday ? 'bg-app-accentTint/60' : 'hover:bg-app-bg/60'
                      }`}
                    >
                      <th
                        scope="row"
                        className={`sticky left-0 z-10 px-3 text-left font-normal border-r border-app-border ${
                          isToday ? 'bg-[#EAF4EF]' : 'bg-app-surface'
                        }`}
                      >
                        <span className="text-[13px] font-semibold tabular-nums">
                          {row.date.slice(8)}
                        </span>
                        <span
                          className={`ml-2 text-[10.5px] uppercase tracking-[0.05em] ${
                            isFriday ? 'text-app-goldInk font-semibold' : 'text-app-tertiary'
                          }`}
                        >
                          {isToday
                            ? 'Today'
                            : rowDate.toLocaleDateString('en-GB', { weekday: 'short' })}
                        </span>
                      </th>

                      {PRAYER_PAIRS.map((p) => {
                        const azKey = `${p.prefix}_azan` as keyof PrayerSchedule;
                        const iqKey = `${p.prefix}_iqamah` as keyof PrayerSchedule;
                        return (
                          <React.Fragment key={p.prefix}>
                            <TimeCell
                              label={`${p.label} Azan ${row.date}`}
                              tone="az"
                              value={String(row[azKey] ?? '')}
                              onChange={(v) => handleCellChange(idx, azKey, v)}
                              dirty={isCellDirty(row.date, azKey)}
                              invalid={isCellInvalid(row.date, azKey)}
                            />
                            <TimeCell
                              label={`${p.label} Iqamah ${row.date}`}
                              tone="iq"
                              value={String(row[iqKey] ?? '')}
                              onChange={(v) => handleCellChange(idx, iqKey, v)}
                              dirty={isCellDirty(row.date, iqKey)}
                              invalid={isCellInvalid(row.date, iqKey)}
                            />
                          </React.Fragment>
                        );
                      })}

                      <TimeCell
                        label={`Sunrise ${row.date}`}
                        value={String(row.sunrise ?? '')}
                        onChange={(v) => handleCellChange(idx, 'sunrise', v)}
                        dirty={isCellDirty(row.date, 'sunrise')}
                      />

                      <TimeCell
                        label={`Jumu'ah Azan ${row.date}`}
                        value={String(row.jummah_azan ?? '')}
                        onChange={(v) => handleCellChange(idx, 'jummah_azan', v)}
                        disabled={!isFriday}
                        dirty={isCellDirty(row.date, 'jummah_azan')}
                        invalid={isCellInvalid(row.date, 'jummah_azan')}
                      />
                      <TimeCell
                        label={`Jumu'ah Bayan ${row.date}`}
                        value={String(row.jummah_bayan ?? '')}
                        onChange={(v) => handleCellChange(idx, 'jummah_bayan', v)}
                        disabled={!isFriday}
                        dirty={isCellDirty(row.date, 'jummah_bayan')}
                      />
                      <TimeCell
                        label={`Jumu'ah Iqamah ${row.date}`}
                        value={String(row.jummah_iqamah ?? '')}
                        onChange={(v) => handleCellChange(idx, 'jummah_iqamah', v)}
                        disabled={!isFriday}
                        dirty={isCellDirty(row.date, 'jummah_iqamah')}
                        invalid={isCellInvalid(row.date, 'jummah_iqamah')}
                      />
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Footer: validation + status */}
        <div className="h-11 px-4 flex items-center justify-between gap-4 border-t border-app-border">
          {violations.length ? (
            <span className="inline-flex items-center gap-1.5 text-[12.5px]" role="alert">
              <AlertTriangle className="w-3.5 h-3.5 text-app-danger" aria-hidden="true" />
              <span className="text-[#991B1B]">
                {violations[0].date.slice(8)} {monthLabel.split(' ')[0]} —{' '}
                {violations[0].message}
              </span>
            </span>
          ) : status ? (
            <span
              role="status"
              className={`inline-flex items-center gap-1.5 text-[12.5px] ${
                status.type === 'success' ? 'text-app-primary' : 'text-app-danger'
              }`}
            >
              {status.type === 'success' ? (
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              {status.text}
            </span>
          ) : (
            <span className="text-[12.5px] text-app-tertiary">
              Edits stay on this screen until you publish.
            </span>
          )}

          <span className="text-[12px] text-app-tertiary tabular-nums shrink-0">
            {rows.length} dates
          </span>
        </div>
      </div>

      {/* Apply to range */}
      {showRangeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-app-ink/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="range-title"
        >
          <div className="w-full max-w-[420px] rounded-panel bg-app-surface border border-app-border shadow-xl">
            <header className="h-12 px-4 flex items-center justify-between border-b border-app-border">
              <h3 id="range-title" className="text-[15px] font-semibold">
                Apply time to date range
              </h3>
              <button
                type="button"
                onClick={() => setShowRangeModal(false)}
                aria-label="Close"
                className="w-8 h-8 -mr-1 flex items-center justify-center rounded-field text-app-tertiary hover:text-app-text hover:bg-app-bg transition-colors duration-200"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </header>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="bulk-prayer" className={labelCls}>
                    Prayer
                  </label>
                  <select
                    id="bulk-prayer"
                    value={bulkPrayer}
                    onChange={(e) => setBulkPrayer(e.target.value)}
                    className={inputClass}
                  >
                    {PRAYER_PAIRS.map((p) => (
                      <option key={p.prefix} value={p.prefix}>
                        {p.label}
                      </option>
                    ))}
                    <option value="jummah">Jumu&apos;ah (Fridays only)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="bulk-field" className={labelCls}>
                    Field
                  </label>
                  <select
                    id="bulk-field"
                    value={bulkField}
                    onChange={(e) => setBulkField(e.target.value as 'azan' | 'iqamah')}
                    disabled={bulkPrayer === 'jummah'}
                    className={`${inputClass} disabled:opacity-50`}
                  >
                    <option value="iqamah">Iqamah</option>
                    <option value="azan">Azan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="bulk-start" className={labelCls}>
                    Start date
                  </label>
                  <input
                    id="bulk-start"
                    type="date"
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="bulk-end" className={labelCls}>
                    End date
                  </label>
                  <input
                    id="bulk-end"
                    type="date"
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="bulk-time" className={labelCls}>
                  New time (HH:MM, 24-hour)
                </label>
                <input
                  id="bulk-time"
                  type="time"
                  value={bulkTime}
                  onChange={(e) => setBulkTime(e.target.value)}
                  className={`${inputClass} font-mono tabular-nums`}
                />
              </div>
            </div>

            <footer className="px-4 py-3 border-t border-app-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRangeModal(false)}
                className="h-9 px-3 rounded-field text-[13px] font-medium text-app-secondary hover:text-app-text hover:bg-app-bg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyRange}
                className="h-9 px-4 rounded-field bg-app-primary text-white text-[13px] font-semibold hover:bg-app-primaryHover transition-colors duration-200"
              >
                Apply to range
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
