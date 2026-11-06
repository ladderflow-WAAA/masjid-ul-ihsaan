import React from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Lock, Bell, Trash2 } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F7F6F2] text-[#18181B] py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#0D5C3A]/10">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-[#E6E2DB] shadow-sm p-6 sm:p-10 space-y-8">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D5C3A] hover:underline mb-6 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl text-[#0D5C3A]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18181B] tracking-tight">
                Privacy <span className="font-serif italic font-normal text-[#0D5C3A]">Policy</span>
              </h1>
              <p className="text-xs text-[#6B6661] mt-1">
                Last updated: 2026 &bull; Masjidul Ihsaan, Sithalapakkam
              </p>
            </div>
          </div>
        </div>

        <section className="space-y-4 text-xs text-[#6B6661] leading-relaxed">
          <p>
            This Privacy Policy outlines how the <strong>Masjidul Ihsaan</strong> mobile application and community web portal manage data. Our architecture is designed around data minimization: congregation members do not require an account, and we do not track or sell user information.
          </p>

          <div className="border-t border-[#EFECE6] pt-5 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F0FDF4] text-[#0D5C3A] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-[#18181B] text-sm">
                  1. No Personal Accounts or Identification
                </h2>
                <p className="mt-1 leading-relaxed">
                  Congregation members do not create an account to use the application. We do not ask for or collect your name, phone number, email address, contacts, photos, or files.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F0FDF4] text-[#0D5C3A] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-[#18181B] text-sm">
                  2. Push Notifications Data Handling
                </h2>
                <p className="mt-1 leading-relaxed">
                  If you explicitly enable community notifications in the app settings, an anonymous device push token is generated through the Expo Push service. The only data stored on our server is:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-[#6B6661] pl-2">
                  <li>An anonymous Expo push token string</li>
                  <li>Device operating system platform (Android / iOS)</li>
                  <li>Preferred notification language (English or Tamil)</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#F0FDF4] text-[#0D5C3A] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-[#18181B] text-sm">
                  3. Token Deletion &amp; Opt-Out
                </h2>
                <p className="mt-1 leading-relaxed">
                  You can opt out at any time by disabling notifications in the app settings or uninstalling the application. Stale tokens are automatically purged after 90 days of inactivity.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
