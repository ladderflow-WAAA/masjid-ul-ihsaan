'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ExternalLink, LogOut } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/timetable', label: 'Timetable' },
  { href: '/announcements', label: 'Announcements' },
  { href: '/settings', label: 'Settings' },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-app-ink border-b border-app-inkBorder">
      <div className="h-16 px-6 flex items-center justify-between gap-6">
        <div className="flex items-center gap-8 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 shrink-0 group"
            aria-label="Masjidul Ihsaan admin home"
          >
            <span className="w-[26px] h-[26px] rounded-md bg-white/[0.07] flex items-center justify-center text-app-sage group-hover:bg-white/[0.12] transition-colors duration-200">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-[15px] h-[15px]"
                aria-hidden="true"
              >
                <path d="M6.5 20.5V10.5a5.5 5.5 0 0 1 11 0v10" />
                <path d="M4 20.5h16" />
              </svg>
            </span>
            <span className="text-[15px] font-semibold text-app-bgMobile tracking-[-0.01em] whitespace-nowrap">
              Masjidul Ihsaan
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 h-16" aria-label="Admin sections">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative h-16 flex items-center px-3 text-[14px] transition-colors duration-200 ${
                    active
                      ? 'text-white font-semibold'
                      : 'text-app-sage font-medium hover:text-white'
                  }`}
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 bottom-0 h-[2px] bg-app-sage transition-opacity duration-200 ${
                      active ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-field text-[13px] font-medium text-app-sage hover:text-white hover:bg-white/[0.07] transition-colors duration-200"
          >
            <span>View public site</span>
            <ExternalLink className="w-[14px] h-[14px]" aria-hidden="true" />
          </Link>

          <span aria-hidden="true" className="hidden sm:block w-px h-4 bg-white/15" />

          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-field text-[13px] font-medium text-white/70 border border-white/15 hover:text-white hover:border-white/30 transition-colors duration-200"
          >
            <LogOut className="w-[14px] h-[14px]" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* Mobile: same items, horizontally scrollable */}
      <nav
        className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto border-t border-app-inkBorder"
        aria-label="Admin sections"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 h-9 px-3 rounded-field flex items-center text-[13px] whitespace-nowrap transition-colors duration-200 ${
                active
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-app-sage font-medium hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
