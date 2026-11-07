import React from 'react';
import AdminNav from '@/components/AdminNav';
import AnnouncementsManager from '@/components/AnnouncementsManager';

export const dynamic = 'force-dynamic';

export default function AnnouncementsPage() {
  return (
    <div className="min-h-screen bg-app-bg text-app-text flex flex-col">
      <AdminNav />

      <main className="flex-1 w-full px-6 py-6">
        <div className="reveal">
          <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em]">
            Announcements
          </h1>
          <p className="mt-1 text-[14px] leading-5 text-app-secondary">
            Publish community notices in English and Tamil, then send them to subscribed
            devices.
          </p>
        </div>

        <div className="mt-5 reveal reveal-1">
          <AnnouncementsManager />
        </div>
      </main>
    </div>
  );
}
