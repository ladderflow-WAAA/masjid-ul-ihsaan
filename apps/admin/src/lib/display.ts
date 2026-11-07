import type { AnnouncementCategory } from './types';

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  bayan: 'Bayan',
  janazah: 'Janazah',
  community: 'Community',
  ramadan: 'Ramadan',
  schedule_change: 'Schedule change',
};

const CATEGORY_LABELS_TA: Record<string, string> = {
  general: 'பொது',
  bayan: 'பயான்',
  janazah: 'ஜனாஸா',
  community: 'சமூகம்',
  ramadan: 'ரமழான்',
  schedule_change: 'நேர மாற்றம்',
};

/** "05:00" or "05:00:00" -> "5:00 AM" */
export function formatTime(value?: string | null): string {
  if (!value) return '—';
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${suffix}`;
}

function toDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "6 November 2026" */
export function formatDateLong(value?: string | null): string {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "6 Nov" */
export function formatDateShort(value?: string | null): string {
  const date = toDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** "6 Nov, 8:14 PM" */
export function formatDateTimeShort(value?: string | null): string {
  const date = toDate(value);
  if (!date) return '—';
  const time = date.toLocaleTimeString('en-GB', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${formatDateShort(value)}, ${time}`;
}

/** "Friday, 6 November 2026" */
export function formatWeekdayLong(value?: string | null): string {
  const date = toDate(value) ?? new Date();
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function categoryLabel(value: string): string {
  return CATEGORY_LABELS[value] ?? value;
}

export function categoryLabelTa(value: string): string {
  return CATEGORY_LABELS_TA[value] ?? value;
}

export type { AnnouncementCategory };
