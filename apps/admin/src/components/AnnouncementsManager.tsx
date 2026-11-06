'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Announcement, AnnouncementCategory } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { fallbackAnnouncements } from '@/lib/mockData';
import { categoryLabel, formatDateLong, formatDateTimeShort, formatDateShort } from '@/lib/display';
import { AlertTriangle, Check, Plus, Search, X } from 'lucide-react';

const CATEGORIES: { value: AnnouncementCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'bayan', label: 'Bayan / Lecture' },
  { value: 'schedule_change', label: 'Schedule change' },
  { value: 'community', label: 'Community / Welfare' },
  { value: 'ramadan', label: 'Ramadan' },
  { value: 'janazah', label: 'Janazah' },
];

const inputCls =
  'w-full h-10 px-3 rounded-field bg-app-bg border border-app-border text-[13.5px] text-app-text placeholder:text-app-tertiary focus:outline-none focus:bg-app-surface focus:border-app-primary focus:ring-[3px] focus:ring-app-primary/15 transition-colors duration-100';

const labelCls = 'block text-[12px] font-medium text-app-secondary mb-1.5';

type FormState = {
  category: AnnouncementCategory;
  isUrgent: boolean;
  titleEn: string;
  titleTa: string;
  bodyEn: string;
  bodyTa: string;
  speakerName: string;
  eventAt: string;
  pushRequested: boolean;
};

const emptyForm: FormState = {
  category: 'general',
  isUrgent: false,
  titleEn: '',
  titleTa: '',
  bodyEn: '',
  bodyTa: '',
  speakerName: '',
  eventAt: '',
  pushRequested: true,
};

export default function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setActiveForm] = useState<FormState>(emptyForm);
  const [initialPushSentAt, setInitialPushSentAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const loadAnnouncements = useCallback(async (selectFirst = false) => {
    const supabase = createClient();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      const list = !error && data && data.length > 0 ? data : fallbackAnnouncements;
      setAnnouncements(list);

      if (selectFirst && list.length > 0) {
        openEditRecord(list[0], list);
      }
    } catch {
      setAnnouncements(fallbackAnnouncements);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAnnouncements(true);
  }, [loadAnnouncements]);

  function openEditRecord(ann: Announcement, list?: Announcement[]) {
    setActiveId(ann.id);
    setInitialPushSentAt(ann.push_sent_at ?? null);
    setActiveForm({
      category: ann.category,
      isUrgent: ann.is_urgent,
      titleEn: ann.title_en || '',
      titleTa: ann.title_ta || '',
      bodyEn: ann.body_en || '',
      bodyTa: ann.body_ta || '',
      speakerName: ann.speaker_name || '',
      eventAt: ann.event_at ? ann.event_at.slice(0, 16) : '',
      pushRequested: false,
    });
    setStatus(null);
    if (list) setAnnouncements(list);
  }

  const openCreate = () => {
    setActiveId(null);
    setInitialPushSentAt(null);
    setActiveForm(emptyForm);
    setStatus(null);
  };

  const activeRecord = useMemo(
    () => announcements.find((a) => a.id === activeId) ?? null,
    [announcements, activeId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return announcements.filter((ann) => {
      if (filterCategory !== 'all' && ann.category !== filterCategory) return false;
      if (!q) return true;
      return (
        (ann.title_en || '').toLowerCase().includes(q) ||
        (ann.title_ta || '').toLowerCase().includes(q) ||
        (ann.body_en || '').toLowerCase().includes(q) ||
        (ann.body_ta || '').toLowerCase().includes(q)
      );
    });
  }, [announcements, query, filterCategory]);

  const handleSubmit = async (publish: boolean) => {
    const hasEn = form.titleEn.trim() && form.bodyEn.trim();
    const hasTa = form.titleTa.trim() && form.bodyTa.trim();

    if (!hasEn && !hasTa) {
      setStatus({
        type: 'error',
        text: 'Add a complete title and body in English or Tamil.',
      });
      return;
    }

    const supabase = createClient();
    setSubmitting(true);
    setStatus(null);

    const payload = {
      category: form.category,
      is_urgent: form.isUrgent,
      title_en: form.titleEn.trim() || null,
      title_ta: form.titleTa.trim() || null,
      body_en: form.bodyEn.trim() || null,
      body_ta: form.bodyTa.trim() || null,
      speaker_name: form.speakerName.trim() || null,
      event_at: form.eventAt ? new Date(form.eventAt).toISOString() : null,
      is_published: publish,
      published_at: publish ? new Date().toISOString() : null,
      push_requested: publish ? form.pushRequested : false,
      updated_at: new Date().toISOString(),
    };

    const { error } = activeId
      ? await supabase.from('announcements').update(payload).eq('id', activeId)
      : await supabase.from('announcements').insert(payload);

    if (error) {
      setSubmitting(false);
      setStatus({ type: 'error', text: error.message });
      return;
    }

    await loadAnnouncements();
    setSubmitting(false);
    setStatus({
      type: 'success',
      text: publish ? 'Announcement published.' : 'Draft saved.',
    });
  };

  const handleDelete = async (ann: Announcement) => {
    const supabase = createClient();
    const { error } = await supabase.from('announcements').delete().eq('id', ann.id);

    if (error) {
      setStatus({ type: 'error', text: error.message });
      return;
    }

    setActiveId(null);
    setActiveForm(emptyForm);
    await loadAnnouncements();
    setStatus({ type: 'success', text: 'Announcement deleted.' });
  };

  const handleSendPush = async (ann: Announcement) => {
    setStatus(null);
    try {
      const res = await fetch(
        `/api/announcements/${ann.id}/push${ann.push_sent_at ? '?resend=true' : ''}`,
        { method: 'POST' },
      );
      const body = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setStatus({ type: 'error', text: body.error || body.message || 'Push failed.' });
        return;
      }
      await loadAnnouncements();
      setStatus({ type: 'success', text: body.message || 'Push notification sent.' });
    } catch {
      setStatus({ type: 'error', text: 'Push request failed.' });
    }
  };

  const isCreating = activeId === null;
  const hasEn = Boolean(form.titleEn.trim() && form.bodyEn.trim());
  const hasTa = Boolean(form.titleTa.trim() && form.bodyTa.trim());

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-5 items-start">
      {/* Register */}
      <section className="rounded-panel border border-app-border bg-app-surface shadow-panel overflow-hidden">
        <header className="h-12 px-4 flex items-center justify-between border-b border-app-border">
          <h2 className="text-[15px] font-semibold">All announcements</h2>
          <span className="text-[12px] text-app-tertiary tabular-nums">
            {announcements.length}
          </span>
        </header>

        <div className="p-3 space-y-2 border-b border-app-border">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-tertiary pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title or body"
              aria-label="Search announcements"
              className={`${inputCls} pl-8`}
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            aria-label="Filter by category"
            className="h-8 w-full rounded-md border border-app-border bg-app-surface px-2 text-[12px] text-app-secondary"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="max-h-[620px] overflow-y-auto">
          {loading ? (
            <p className="px-4 py-8 text-[13px] text-app-secondary">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-8 text-[13px] text-app-secondary">
              No announcements match this view.
            </p>
          ) : (
            filtered.map((ann) => {
              const active = ann.id === activeId;
              const title = ann.title_en || ann.title_ta || 'Untitled';
              return (
                <button
                  key={ann.id}
                  type="button"
                  onClick={() => openEditRecord(ann)}
                  aria-current={active ? 'true' : undefined}
                  className={`relative w-full text-left px-4 py-3 border-t border-app-hairline first:border-t-0 transition-colors duration-100 ${
                    active ? 'bg-app-accentTint' : 'hover:bg-app-bg/70'
                  }`}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-0 bottom-0 w-0.5 bg-app-primary"
                    />
                  )}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold leading-5 truncate">{title}</p>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[11px] text-app-tertiary">
                        <span>{categoryLabel(ann.category)}</span>
                        {ann.title_en && ann.body_en && (
                          <span className="px-1 rounded bg-app-muted text-app-secondary font-medium">
                            EN
                          </span>
                        )}
                        {ann.title_ta && ann.body_ta && (
                          <span className="px-1 rounded bg-app-muted text-app-secondary font-medium">
                            TA
                          </span>
                        )}
                        {ann.is_urgent && (
                          <span className="inline-flex items-center gap-1 font-semibold text-app-goldInk">
                            <span
                              aria-hidden="true"
                              className="w-1.5 h-1.5 rounded-full bg-app-gold"
                            />
                            Urgent
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="block text-[10.5px] uppercase tracking-[0.05em] font-semibold text-app-secondary">
                        {ann.is_published ? 'Published' : 'Draft'}
                      </span>
                      {ann.push_sent_at && (
                        <span className="block mt-1 text-[10.5px] text-app-tertiary tabular-nums">
                          Push {formatDateShort(ann.push_sent_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="p-3 border-t border-app-border">
          <button
            type="button"
            onClick={openCreate}
            className="w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-field border border-app-border text-[13px] font-semibold text-app-text hover:bg-app-bg transition-colors duration-200"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            New announcement
          </button>
        </div>
      </section>

      {/* Composer */}
      <section className="rounded-panel border border-app-border bg-app-surface shadow-panel overflow-hidden">
        <header className="h-12 px-5 flex items-center justify-between gap-4 border-b border-app-border">
          <h2 className="text-[15px] font-semibold">
            {isCreating ? 'New announcement' : 'Edit announcement'}
          </h2>
          {activeRecord ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-app-secondary">
              <span
                aria-hidden="true"
                className={`w-1.5 h-1.5 rounded-full ${
                  activeRecord.is_published ? 'bg-app-accent' : 'bg-app-tertiary'
                }`}
              />
              {activeRecord.is_published
                ? `Published ${formatDateLong(activeRecord.published_at)}`
                : 'Draft'}
            </span>
          ) : (
            <span className="text-[12px] text-app-tertiary">Not saved yet</span>
          )}
        </header>

        <div className="p-5 space-y-5">
          {/* Language columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-semibold text-app-text">English</span>
                <span
                  className={`text-[11px] ${hasEn ? 'text-app-primary' : 'text-app-tertiary'}`}
                >
                  {hasEn ? 'Complete' : 'Title and body required'}
                </span>
              </div>
              <label htmlFor="title-en" className={labelCls}>
                Title
              </label>
              <input
                id="title-en"
                type="text"
                value={form.titleEn}
                onChange={(e) => setActiveForm({ ...form, titleEn: e.target.value })}
                placeholder="Announcement title"
                className={inputCls}
              />
              <label htmlFor="body-en" className={`${labelCls} mt-3`}>
                Body
              </label>
              <textarea
                id="body-en"
                rows={8}
                value={form.bodyEn}
                onChange={(e) => setActiveForm({ ...form, bodyEn: e.target.value })}
                placeholder="Date, time and instructions"
                className="w-full rounded-field bg-app-bg border border-app-border p-3 text-[13.5px] leading-6 text-app-text placeholder:text-app-tertiary focus:outline-none focus:bg-app-surface focus:border-app-primary focus:ring-[3px] focus:ring-app-primary/15 transition-colors duration-100 resize-y"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-tamil text-[12px] font-semibold text-app-text">தமிழ்</span>
                <span
                  className={`text-[11px] ${hasTa ? 'text-app-primary' : 'text-app-tertiary'}`}
                >
                  {hasTa ? 'Complete' : 'Title and body required'}
                </span>
              </div>
              <label htmlFor="title-ta" className={`${labelCls} font-tamil`}>
                தலைப்பு
              </label>
              <input
                id="title-ta"
                type="text"
                value={form.titleTa}
                onChange={(e) => setActiveForm({ ...form, titleTa: e.target.value })}
                placeholder="அறிவிப்பின் தலைப்பு"
                className={`${inputCls} font-tamil`}
              />
              <label htmlFor="body-ta" className={`${labelCls} mt-3 font-tamil`}>
                விவரம்
              </label>
              <textarea
                id="body-ta"
                rows={8}
                value={form.bodyTa}
                onChange={(e) => setActiveForm({ ...form, bodyTa: e.target.value })}
                placeholder="நாள், நேரம் மற்றும் விவரங்கள்"
                className="font-tamil w-full rounded-field bg-app-bg border border-app-border p-3 text-[13.5px] leading-7 text-app-text placeholder:text-app-tertiary focus:outline-none focus:bg-app-surface focus:border-app-primary focus:ring-[3px] focus:ring-app-primary/15 transition-colors duration-100 resize-y"
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
            <div>
              <label htmlFor="ann-category" className={labelCls}>
                Category
              </label>
              <select
                id="ann-category"
                value={form.category}
                onChange={(e) =>
                  setActiveForm({ ...form, category: e.target.value as AnnouncementCategory })
                }
                className={inputCls}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ann-speaker" className={labelCls}>
                Speaker
              </label>
              <input
                id="ann-speaker"
                type="text"
                value={form.speakerName}
                onChange={(e) => setActiveForm({ ...form, speakerName: e.target.value })}
                placeholder="Name"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="ann-event" className={labelCls}>
                Event date and time
              </label>
              <input
                id="ann-event"
                type="datetime-local"
                value={form.eventAt}
                onChange={(e) => setActiveForm({ ...form, eventAt: e.target.value })}
                className={`${inputCls} tabular-nums`}
              />
            </div>

            <div>
              <span className={labelCls}>Urgent notice</span>
              <button
                type="button"
                role="switch"
                aria-checked={form.isUrgent}
                onClick={() => setActiveForm({ ...form, isUrgent: !form.isUrgent })}
                className={`h-10 w-full inline-flex items-center justify-between gap-2 px-3 rounded-field border text-[13px] font-medium transition-colors duration-200 ${
                  form.isUrgent
                    ? 'border-app-gold bg-app-goldTint text-app-goldInk'
                    : 'border-app-border bg-app-bg text-app-secondary'
                }`}
              >
                <span>{form.isUrgent ? 'Shown as urgent' : 'Normal'}</span>
                <span
                  aria-hidden="true"
                  className={`w-8 h-[18px] rounded-full relative transition-colors duration-200 ${
                    form.isUrgent ? 'bg-app-gold' : 'bg-app-tertiary/40'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all duration-200 ${
                      form.isUrgent ? 'left-[18px]' : 'left-0.5'
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>

          {/* Delivery */}
          <div className="rounded-field border border-app-border bg-app-bg px-4 py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-app-secondary">Delivery</p>
                <p className="mt-0.5 text-[13px] text-app-text tabular-nums">
                  {initialPushSentAt
                    ? `Push sent ${formatDateTimeShort(initialPushSentAt)}`
                    : 'Not sent yet'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {activeRecord?.is_published && (
                  <button
                    type="button"
                    onClick={() => handleSendPush(activeRecord)}
                    className="h-9 px-3 rounded-field border border-app-border bg-app-surface text-[13px] font-medium text-app-text hover:bg-app-bg transition-colors duration-200"
                  >
                    {initialPushSentAt ? 'Resend push' : 'Send push'}
                  </button>
                )}

                {isCreating && (
                  <label className="inline-flex items-center gap-2 text-[13px] text-app-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.pushRequested}
                      onChange={(e) =>
                        setActiveForm({ ...form, pushRequested: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-app-border text-app-primary focus:ring-app-primary"
                    />
                    Send push on publish
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <footer className="h-14 px-5 flex items-center justify-between gap-4 border-t border-app-border">
          <div className="min-w-0">
            {status ? (
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
                {activeId ? 'Editing an existing announcement' : 'Unsaved draft'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeRecord && (
              <button
                type="button"
                onClick={() => handleDelete(activeRecord)}
                className="h-9 px-3 rounded-field text-[13px] font-medium text-app-danger hover:bg-app-dangerTint transition-colors duration-200 mr-auto"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="h-9 px-3.5 rounded-field border border-app-border text-[13px] font-medium text-app-text hover:bg-app-bg disabled:opacity-60 transition-colors duration-200"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="h-9 px-4 rounded-field bg-app-primary text-white text-[13px] font-semibold hover:bg-app-primaryHover disabled:opacity-60 transition-colors duration-200"
            >
              {submitting ? 'Publishing…' : 'Publish now'}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
