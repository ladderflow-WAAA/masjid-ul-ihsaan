import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Lora, Amiri } from 'next/font/google';
import './globals.css';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

const sansFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const serifFont = Lora({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600'],
});

const arabicFont = Amiri({
  subsets: ['arabic'],
  variable: '--font-arabic',
  display: 'swap',
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  title: 'Masjidul Ihsaan | Prayer Timetable',
  description:
    'Official prayer timetable (Azan & Iqamah) and announcements for Masjidul Ihsaan, Sithalapakkam.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Masjid App',
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#071912',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${sansFont.variable} ${serifFont.variable} ${arabicFont.variable}`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-screen bg-[#F8F6F1] text-[#141716] font-sans antialiased selection:bg-[#0C4E31]/15 pb-safe">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
