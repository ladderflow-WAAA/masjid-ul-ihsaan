import React from 'react';
import AdminNav from '@/components/AdminNav';
import TimetableEditor from '@/components/TimetableEditor';

export const dynamic = 'force-dynamic';

export default function TimetablePage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  return (
    <div className="min-h-screen bg-app-bg text-app-text flex flex-col">
      <AdminNav />

      <main className="flex-1 w-full px-6 py-6">
        <div className="reveal">
          <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em]">
            Timetable
          </h1>
          <p className="mt-1 text-[14px] leading-5 text-app-secondary">
            Edit monthly prayer times. Changes appear on the congregation app and the
            public site after publishing.
          </p>
        </div>

        <div className="mt-5 reveal reveal-1">
          <TimetableEditor initialYear={currentYear} initialMonth={currentMonth} />
        </div>
      </main>
    </div>
  );
}
