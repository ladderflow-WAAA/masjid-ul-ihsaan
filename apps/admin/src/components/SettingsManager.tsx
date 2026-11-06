'use client';

import React, { useState } from 'react';
import { MasjidSettings, AdminRecord } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { formatDateLong } from '@/lib/display';
import { AlertCircle, Check } from 'lucide-react';

interface SettingsManagerProps {
  initialSettings: MasjidSettings | null;
  adminRecords: AdminRecord[];
}

const INPUT_CLASS =
  'w-full h-10 px-3 rounded-field bg-app-bg border border-app-border text-[13.5px] text-app-text placeholder:text-app-tertiary focus:outline-none focus:bg-app-surface focus:border-app-primary focus:ring-[3px] focus:ring-app-primary/15 transition-colors duration-200';

const LABEL_CLASS = 'block text-[12px] font-medium text-app-secondary mb-1.5';

const SECTIONS = [
  { id: 'identity', label: 'Identity' },
  { id: 'location', label: 'Location and contact' },
  { id: 'pwa', label: 'Web App & PWA' },
];

function Field({
  id,
  label,
  hint,
  children,
  className = '',
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-[11px] text-app-tertiary">{hint}</p> : null}
    </div>
  );
}

function Panel({
  id,
  title,
  meta,
  children,
}: {
  id: string;
  title: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-panel border border-app-border bg-app-surface shadow-panel overflow-hidden"
    >
      <header className="h-12 px-5 flex items-center justify-between gap-4 border-b border-app-border">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {meta}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function SettingsManager({
  initialSettings,
  adminRecords,
}: SettingsManagerProps) {
  const [nameEn, setNameEn] = useState(initialSettings?.name_en || 'Masjidul Ihsaan');
  const [nameTa, setNameTa] = useState(initialSettings?.name_ta || 'மஸ்ஜிதுல் இஹ்சான்');
  const [nameAr, setNameAr] = useState(initialSettings?.name_ar || 'مَسْجِدُ الْإِحْسَانِ');
  const [address, setAddress] = useState(initialSettings?.address || '');
  const [mapsUrl, setMapsUrl] = useState(initialSettings?.maps_url || '');
  const [latitude, setLatitude] = useState(initialSettings?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState(initialSettings?.longitude?.toString() || '');
  const [timezone, setTimezone] = useState(initialSettings?.timezone || 'Asia/Kolkata');
  const [contactPhone, setContactPhone] = useState(initialSettings?.contact_phone || '');
  const [latestVersion, setLatestVersion] = useState(initialSettings?.latest_version || '1.0.0');
  const [apkUrl, setApkUrl] = useState(initialSettings?.apk_url || '');

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    const supabase = createClient();

    const payload = {
      id: 1,
      name_en: nameEn.trim(),
      name_ta: nameTa.trim(),
      name_ar: nameAr.trim(),
      address: address.trim() || null,
      maps_url: mapsUrl.trim() || null,
      latitude: latitude ? Number.parseFloat(latitude) : null,
      longitude: longitude ? Number.parseFloat(longitude) : null,
      timezone: timezone.trim() || 'Asia/Kolkata',
      contact_phone: contactPhone.trim() || null,
      latest_version: latestVersion.trim() || null,
      apk_url: apkUrl.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('masjid_settings')
      .upsert(payload, { onConflict: 'id' });

    setSaving(false);

    if (error) {
      setStatus({ type: 'error', text: error.message });
      return;
    }

    setStatus({
      type: 'success',
      text: 'Settings saved. Devices pick up the change on their next sync.',
    });
  };

  return (
    <form
      onSubmit={handleSave}
      className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)] gap-6 items-start"
    >
      {/* Anchor rail */}
      <aside className="hidden lg:block sticky top-24 self-start">
        <nav aria-label="Settings sections" className="space-y-1">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="block px-3 h-9 leading-9 rounded-field text-[13px] font-medium text-app-secondary hover:text-app-primary hover:bg-app-surface transition-colors duration-200"
            >
              {section.label}
            </a>
          ))}
          <a
            href="#admins"
            className="block px-3 h-9 leading-9 rounded-field text-[13px] font-medium text-app-secondary hover:text-app-primary hover:bg-app-surface transition-colors duration-200"
          >
            Authorized administrators
          </a>
        </nav>
      </aside>

      <div className="space-y-5 min-w-0">
        {/* Action row */}
        <div className="flex items-center justify-end gap-3">
          {status && (
            <span
              role="status"
              className={`inline-flex items-center gap-1.5 text-[12.5px] font-medium ${
                status.type === 'success' ? 'text-app-primary' : 'text-app-danger'
              }`}
            >
              {status.type === 'success' ? (
                <Check className="w-4 h-4" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
              )}
              {status.text}
            </span>
          )}
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-4 rounded-field bg-app-primary text-white text-[13px] font-semibold hover:bg-app-primaryHover focus:outline-none focus:ring-[3px] focus:ring-app-primary/25 disabled:opacity-60 transition-colors duration-200"
          >
            {saving ? 'Saving…' : 'Save configuration'}
          </button>
        </div>

        {/* Identity */}
        <Panel
          id="identity"
          title="Identity"
          meta={<span className="text-[12px] text-app-tertiary">Shown in the app masthead</span>}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field id="name-en" label="English name">
              <input
                id="name-en"
                type="text"
                required
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>

            <Field id="name-ta" label="Tamil name">
              <input
                id="name-ta"
                type="text"
                required
                value={nameTa}
                onChange={(e) => setNameTa(e.target.value)}
                className={`${INPUT_CLASS} font-tamil`}
              />
            </Field>

            <Field id="name-ar" label="Arabic name">
              <input
                id="name-ar"
                type="text"
                required
                dir="rtl"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                className={`${INPUT_CLASS} font-arabic text-[15px]`}
              />
            </Field>
          </div>

          <div className="mt-4 rounded-field bg-app-bg border border-app-border px-4 py-3">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0">
                <p className="font-arabic text-[18px] font-bold text-app-ink leading-[1.7]">
                  {nameAr}
                </p>
                <p className="mt-0.5 text-[15px] font-semibold tracking-[-0.01em]">
                  {nameEn}
                </p>
                <p className="font-tamil text-[12.5px] text-app-secondary">{nameTa}</p>
              </div>
              <span
                aria-hidden="true"
                className="shrink-0 inline-flex items-center rounded-full bg-app-surface border border-app-border p-0.5 text-[11px] font-semibold"
              >
                <span className="px-2.5 h-6 inline-flex items-center rounded-full bg-app-primary text-white">
                  EN
                </span>
                <span className="px-2.5 h-6 inline-flex items-center rounded-full text-app-secondary font-tamil">
                  தமிழ்
                </span>
              </span>
            </div>
          </div>
        </Panel>

        {/* Location and contact */}
        <Panel id="location" title="Location and contact">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field id="address" label="Address" className="md:col-span-2">
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Skylab Avenue, Sithalapakkam, Tambaram, Tamil Nadu 600045"
                className={INPUT_CLASS}
              />
            </Field>

            <Field id="maps-url" label="Google Maps URL">
              <input
                id="maps-url"
                type="url"
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/…"
                className={INPUT_CLASS}
              />
            </Field>

            <Field id="contact-phone" label="Contact phone">
              <input
                id="contact-phone"
                type="text"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+91 94440 00000"
                className={INPUT_CLASS}
              />
            </Field>

            <Field id="latitude" label="Latitude">
              <input
                id="latitude"
                type="text"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="12.894208"
                className={`${INPUT_CLASS} font-mono tabular-nums`}
              />
            </Field>

            <Field id="longitude" label="Longitude">
              <input
                id="longitude"
                type="text"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="80.1898496"
                className={`${INPUT_CLASS} font-mono tabular-nums`}
              />
            </Field>

            <Field
              id="timezone"
              label="Timezone"
              className="md:col-span-2"
              hint="Used to calculate prayer reminders on member devices."
            >
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              </select>
            </Field>
          </div>
        </Panel>

        {/* Web App & PWA distribution */}
        <Panel
          id="pwa"
          title="Web App & PWA Distribution"
          meta={
            <span className="text-[12px] text-emerald-800 font-semibold bg-[#EDF7F2] px-2.5 py-0.5 rounded-full border border-[#BDE3D2]">
              PWA Ready (Zero Install)
            </span>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-app-secondary leading-relaxed">
              Congregants access this application directly in any browser and add it to their home screen as a standalone mobile app. No app store download or APK is required.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field id="latest-version" label="Web app release version">
                <input
                  id="latest-version"
                  type="text"
                  value={latestVersion}
                  onChange={(e) => setLatestVersion(e.target.value)}
                  placeholder="2.0.0"
                  className={`${INPUT_CLASS} font-mono tabular-nums`}
                />
              </Field>

              <Field id="apk-url" label="Public web app / fallback URL" className="md:col-span-2">
                <input
                  id="apk-url"
                  type="url"
                  value={apkUrl}
                  onChange={(e) => setApkUrl(e.target.value)}
                  placeholder="https://masjidul-ihsaan.web.app"
                  className={`${INPUT_CLASS} font-mono`}
                />
              </Field>
            </div>
          </div>
        </Panel>

        {/* Authorized administrators */}
        <section
          id="admins"
          className="scroll-mt-24 rounded-panel border border-app-border bg-app-surface shadow-panel overflow-hidden"
        >
          <header className="h-12 px-5 flex items-center justify-between gap-4 border-b border-app-border">
            <h2 className="text-[15px] font-semibold">
              Authorized committee administrators
            </h2>
            <span className="inline-flex items-center gap-1.5 text-[12px] text-app-tertiary">
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full bg-app-tertiary"
              />
              Read only
            </span>
          </header>

          {adminRecords.length > 0 ? (
            <ul>
              {adminRecords.map((admin) => (
                <li
                  key={admin.user_id}
                  className="h-11 px-5 flex items-center justify-between gap-4 border-t border-app-hairline first:border-t-0"
                >
                  <span className="font-mono text-[12.5px] text-app-secondary truncate">
                    {admin.user_id}
                  </span>
                  <span className="shrink-0 text-[12px] text-app-tertiary tabular-nums">
                    Added {formatDateLong(admin.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-[13px] text-app-secondary">
              No administrator records found. Committee members with database admin
              authorization can access this portal.
            </p>
          )}
        </section>
      </div>
    </form>
  );
}
