'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, ArrowLeft, ExternalLink, Eye, EyeOff, Lock, Mail } from 'lucide-react';

export const dynamic = 'force-dynamic';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const err = searchParams?.get('error');
    if (err === 'not_admin') {
      setErrorMessage(
        'Access denied: This account is not listed in the authorized masjid administrators table.',
      );
    } else if (err === 'unauthorized') {
      setErrorMessage('Session expired or login required to access the admin portal.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setErrorMessage('Failed to sign in');
        setLoading(false);
        return;
      }

      // Verify admin table authorization
      const { data: adminRecord, error: adminErr } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (adminErr || !adminRecord) {
        await supabase.auth.signOut();
        setErrorMessage(
          'Access denied: You are not authorized as an administrator for Masjidul Ihsaan.',
        );
        setLoading(false);
        return;
      }

      const redirectTo = searchParams?.get('redirectTo') || '/dashboard';
      router.push(redirectTo);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      setErrorMessage(message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-[400px]">
      <h1 className="text-[28px] leading-9 font-semibold tracking-[-0.02em] text-app-text">
        Committee Portal
      </h1>
      <div className="mt-5 h-px w-full bg-app-border" aria-hidden="true" />

      <div className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="admin-email"
            className="block text-[12px] font-medium text-app-secondary mb-1.5"
          >
            Admin Email
          </label>
          <div className="relative">
            <Mail
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-tertiary pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="committee@masjidulihsaan.org"
              className="w-full h-11 pl-10 pr-3.5 rounded-field bg-app-surface border border-app-border text-[14px] text-app-text placeholder:text-app-tertiary focus:outline-none focus:border-app-primary focus:ring-[3px] focus:ring-app-primary/15 transition-colors duration-200"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="admin-password"
            className="block text-[12px] font-medium text-app-secondary mb-1.5"
          >
            Password
          </label>
          <div className="relative">
            <Lock
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-tertiary pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full h-11 pl-10 pr-11 rounded-field bg-app-surface border border-app-border text-[14px] text-app-text placeholder:text-app-tertiary focus:outline-none focus:border-app-primary focus:ring-[3px] focus:ring-app-primary/15 transition-colors duration-200"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-field text-app-tertiary hover:text-app-secondary transition-colors duration-200"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 p-3 rounded-field bg-app-dangerTint border border-app-dangerBorder"
        >
          <AlertCircle
            className="w-4 h-4 text-app-danger shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <span className="text-[12.5px] leading-[18px] text-[#991B1B]">
            {errorMessage}
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full h-11 rounded-field bg-app-primary text-white text-[14px] font-semibold hover:bg-app-primaryHover focus:outline-none focus:ring-[3px] focus:ring-app-primary/25 disabled:opacity-60 transition-colors duration-200"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      <p className="mt-5 text-[13px] leading-5 text-app-secondary">
        Access is restricted to authorized masjid committee administrators.
      </p>

      <Link
        href="/"
        className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-app-primary hover:underline transition-colors duration-200"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
        Back to public timetable
      </Link>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-app-bg text-app-text lg:grid lg:grid-cols-[42%_1fr]">
      {/* Identity panel */}
      <aside className="bg-app-ink px-8 py-10 lg:px-14 lg:py-14 flex flex-col justify-between lg:border-r lg:border-app-inkBorder">
        <div className="flex items-center gap-2.5">
          <span className="w-[26px] h-[26px] rounded-md bg-white/[0.07] flex items-center justify-center text-app-sage">
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
          <span className="text-[12px] font-medium tracking-[0.06em] uppercase text-app-sage">
            Admin
          </span>
        </div>

        <div className="mt-10 lg:mt-0">
          <p className="font-arabic text-[34px] lg:text-[40px] font-bold leading-[1.6] text-[#F5F3EF]">
            مَسْجِدُ الْإِحْسَانِ
          </p>
          <p className="mt-2 text-[24px] font-semibold tracking-[-0.02em] text-[#F5F3EF]">
            Masjidul Ihsaan
          </p>
          <p className="font-tamil mt-1.5 text-[15px] text-app-sage">
            மஸ்ஜிதுல் இஹ்சான்
          </p>
        </div>

        <div className="mt-10 lg:mt-0 pt-6 border-t border-app-inkBorder">
          <ul className="space-y-2 text-[13px] leading-5 text-app-sage/80">
            <li>Prayer timetable</li>
            <li>Community notices</li>
            <li>Device notifications</li>
          </ul>
        </div>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-col justify-center px-6 py-12 lg:px-12">
        <div className="absolute top-6 right-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-field text-[13px] font-medium text-app-secondary hover:text-app-primary hover:bg-app-surface transition-colors duration-200"
          >
            <span>Public timetable</span>
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="mx-auto lg:mx-0 lg:ml-[max(0px,calc(50%-260px))] w-full">
          <Suspense
            fallback={
              <p className="text-[13px] text-app-tertiary">Loading portal…</p>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
