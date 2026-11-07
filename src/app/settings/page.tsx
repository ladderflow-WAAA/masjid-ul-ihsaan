import React from 'react';
import AdminNav from '@/components/AdminNav';
import SettingsManager from '@/components/SettingsManager';
import { createClient } from '@/lib/supabase/server';
import { MasjidSettings, AdminRecord } from '@/lib/types';
import { fallbackSettings } from '@/lib/mockData';
import { formatDateLong } from '@/lib/display';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SettingsPage() {
  const supabase = await createClient();

  let settings: MasjidSettings | null = null;
  let adminRecords: AdminRecord[] = [];

  try {
    const [settingsRes, adminsRes] = await Promise.all([
      supabase.from('masjid_settings').select('*').eq('id', 1).maybeSingle(),
      supabase
        .from('admins')
        .select('user_id, created_at')
        .order('created_at', { ascending: true }),
    ]);

    settings = settingsRes.data || null;
    adminRecords = adminsRes.data || [];
  } catch {
    // Graceful fallback
  }

  if (!settings) settings = fallbackSettings;

  return (
    <div className="min-h-screen bg-app-bg text-app-text flex flex-col">
      <AdminNav />

      <main className="flex-1 w-full px-6 py-6">
        <div className="reveal">
          <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em]">
            Settings
          </h1>
          <div className="mt-1 flex items-center gap-2.5 text-[13px] text-app-secondary">
            <span>{settings.name_en}</span>
            <span aria-hidden="true" className="w-px h-3 bg-app-border" />
            <span className="tabular-nums">
              Updated {formatDateLong(settings.updated_at)}
            </span>
          </div>
        </div>

        <div className="mt-6 reveal reveal-1">
          <SettingsManager
            initialSettings={settings}
            adminRecords={adminRecords}
          />
        </div>
      </main>
    </div>
  );
}
