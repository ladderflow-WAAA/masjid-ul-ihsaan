'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MasjidSettings, PrayerSchedule, Announcement } from '@/lib/types';
import {
  Clock,
  Calendar as CalendarIcon,
  Bell,
  Info,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Share2,
  Phone,
  Shield,
  Download,
  X,
  User,
  Compass,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Check,
  Navigation,
  Volume2,
  VolumeX,
  Sparkles,
  RotateCcw,
  Smartphone,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PRAYER_KEYS = [
  { key: 'fajr' as const, labelEn: 'Fajr', labelTa: 'ஃபஜ்ர்', Icon: Sunrise },
  { key: 'dhuhr' as const, labelEn: 'Dhuhr', labelTa: 'ளுஹர்', Icon: Sun },
  { key: 'asr' as const, labelEn: 'Asr', labelTa: 'அஸர்', Icon: Sun },
  { key: 'maghrib' as const, labelEn: 'Maghrib', labelTa: 'மஃரிப்', Icon: Sunset },
  { key: 'isha' as const, labelEn: 'Isha', labelTa: 'இஷா', Icon: Moon },
];

const DHIKR_ITEMS = [
  {
    ar: 'سُبْحَانَ اللَّهِ',
    en: 'SubhanAllah',
    ta: 'சுப்ஹானல்லாஹ்',
    meaningEn: 'Glory be to Allah',
    meaningTa: 'அல்லாஹ் தூயவன்',
    target: 33,
  },
  {
    ar: 'الْحَمْدُ لِلَّهِ',
    en: 'Alhamdulillah',
    ta: 'அல்ஹம்துலில்லாஹ்',
    meaningEn: 'All praise is for Allah',
    meaningTa: 'அனைத்துப் புகழும் அல்லாஹ்வுக்கே',
    target: 33,
  },
  {
    ar: 'اللَّهُ أَكْبَرُ',
    en: 'Allahu Akbar',
    ta: 'அல்லாஹு அக்பர்',
    meaningEn: 'Allah is the Greatest',
    meaningTa: 'அல்லாஹ் மிகப் பெரியவன்',
    target: 34,
  },
  {
    ar: 'أَسْتَغْفِرُ اللَّهَ',
    en: 'Astaghfirullah',
    ta: 'அஸ்தஃபிருல்லாஹ்',
    meaningEn: 'I seek forgiveness from Allah',
    meaningTa: 'அல்லாஹ்விடம் பாவமன்னிப்புக் கோருகிறேன்',
    target: 100,
  },
  {
    ar: 'لَا إِلٰهَ إِلَّا اللَّهُ',
    en: 'La ilaha illallah',
    ta: 'லா இலாஹ இல்லல்லாஹ்',
    meaningEn: 'There is no god worthy of worship except Allah',
    meaningTa: 'வணக்கத்திற்குரியவன் அல்லாஹ்வைத் தவிர வேறு யாருமில்லை',
    target: 100,
  },
];

function playChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const playTone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.1);
    };

    playTone(523.25, 0, 0.5); // C5
    playTone(659.25, 0.2, 0.7); // E5
    playTone(783.99, 0.4, 1.1); // G5
  } catch {
    // Audio context not available or user gesture required
  }
}

interface PublicTimetableProps {
  settings: MasjidSettings | null;
  todaySchedule: PrayerSchedule | null;
  monthSchedules: PrayerSchedule[];
  announcements: Announcement[];
  todayDateStr: string;
}

type TabType = 'home' | 'timetable' | 'announcements' | 'tasbih' | 'info';

interface NextEventInfo {
  prayerKey: 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  type: 'azan' | 'iqamah' | 'sunrise';
  nameEn: string;
  nameTa: string;
  nameAr: string;
  timeStr: string;
  instant: Date;
}

export default function PublicTimetable({
  settings,
  todaySchedule,
  monthSchedules,
  announcements,
  todayDateStr,
}: PublicTimetableProps) {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [lang, setLang] = useState<'en' | 'ta'>('en');
  const [now, setNow] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [showQiblaModal, setShowQiblaModal] = useState<boolean>(false);
  const [showInstallModal, setShowInstallModal] = useState<boolean>(false);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);

  // Tasbih digital counter state
  const [tasbihCount, setTasbihCount] = useState<number>(0);
  const [tasbihRounds, setTasbihRounds] = useState<number>(0);
  const [selectedDhikrIndex, setSelectedDhikrIndex] = useState<number>(0);
  const [tasbihTarget, setTasbihTarget] = useState<number>(33);

  // Month navigation for timetable tab
  const [viewDate, setViewDate] = useState(() => {
    const [y, m] = todayDateStr.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  // Load language preference, sound preference, and detect standalone mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('masjid_lang');
      if (saved === 'en' || saved === 'ta') {
        setLang(saved);
      }
      const savedSound = localStorage.getItem('masjid_sound_enabled');
      if (savedSound === 'true') {
        setSoundEnabled(true);
      }
      const isApp =
        window.matchMedia('(display-mode: standalone)').matches ||
        ('standalone' in window.navigator && Boolean((window.navigator as { standalone?: boolean }).standalone));
      setIsStandalone(isApp);

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        if (!isApp) setShowInstallBanner(true);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }
  }, []);

  // Qibla live device orientation sensor
  useEffect(() => {
    if (!showQiblaModal || typeof window === 'undefined') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading: number | null = null;
      if (
        'webkitCompassHeading' in e &&
        typeof (e as unknown as { webkitCompassHeading: number }).webkitCompassHeading === 'number'
      ) {
        heading = (e as unknown as { webkitCompassHeading: number }).webkitCompassHeading;
      } else if (e.alpha !== null) {
        heading = (360 - e.alpha) % 360;
      }
      if (heading !== null) {
        setDeviceHeading(Math.round(heading));
      }
    };

    if ('DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation, true);
      return () => window.removeEventListener('deviceorientation', handleOrientation, true);
    }
  }, [showQiblaModal]);

  const toggleSound = async () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('masjid_sound_enabled', String(next));
    }
    if (next) {
      playChime();
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          await Notification.requestPermission();
        } catch {
          // Permission prompt dismissed
        }
      }
    }
  };

  const handleLangChange = (newLang: 'en' | 'ta') => {
    setLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('masjid_lang', newLang);
    }
  };

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const masjidNameEn = settings?.name_en || 'Masjidul Ihsaan';
  const masjidNameTa = settings?.name_ta || 'மஸ்ஜிதுல் இஹ்சான்';
  const masjidNameAr = settings?.name_ar || 'مَسْجِدُ الْإِحْسَانِ';
  const address = settings?.address || 'Skylab Avenue, Sithalapakkam, Tambaram, Tamil Nadu 600045';
  const mapsUrl = settings?.maps_url || 'https://maps.app.goo.gl/wPgTiSDwAh24Xoa49';

  // Compute Next Prayer and Countdown
  const nextEvent = useMemo<NextEventInfo | null>(() => {
    if (!todaySchedule) return null;

    const [y, m, d] = todayDateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const isFriday = dateObj.getDay() === 5;

    const parseTime = (timeStr?: string | null) => {
      if (!timeStr) return new Date(y, m - 1, d, 23, 59, 59);
      const [hours, minutes] = timeStr.split(':').map(Number);
      return new Date(y, m - 1, d, hours || 0, minutes || 0, 0);
    };

    const events: NextEventInfo[] = [
      {
        prayerKey: 'fajr',
        type: 'azan',
        nameEn: 'Fajr Azan',
        nameTa: 'ஃபஜ்ர் பாங்கு',
        nameAr: 'أَذَانُ الْفَجْر',
        timeStr: todaySchedule.fajr_azan,
        instant: parseTime(todaySchedule.fajr_azan),
      },
      {
        prayerKey: 'fajr',
        type: 'iqamah',
        nameEn: 'Fajr Iqamah',
        nameTa: 'ஃபஜ்ர் இகாமத்',
        nameAr: 'إِقَامَةُ الْفَجْر',
        timeStr: todaySchedule.fajr_iqamah,
        instant: parseTime(todaySchedule.fajr_iqamah),
      },
    ];

    if (todaySchedule.sunrise) {
      events.push({
        prayerKey: 'sunrise',
        type: 'sunrise',
        nameEn: 'Sunrise',
        nameTa: 'சூரிய உதயம்',
        nameAr: 'الشُّرُوق',
        timeStr: todaySchedule.sunrise,
        instant: parseTime(todaySchedule.sunrise),
      });
    }

    if (isFriday && todaySchedule.jummah_iqamah) {
      events.push(
        {
          prayerKey: 'dhuhr',
          type: 'azan',
          nameEn: "Jumu'ah Azan",
          nameTa: 'ஜும்ஆ பாங்கு',
          nameAr: 'أَذَانُ الْجُمُعَة',
          timeStr: todaySchedule.jummah_azan || todaySchedule.dhuhr_azan,
          instant: parseTime(todaySchedule.jummah_azan || todaySchedule.dhuhr_azan),
        },
        {
          prayerKey: 'dhuhr',
          type: 'iqamah',
          nameEn: "Jumu'ah Iqamah",
          nameTa: 'ஜும்ஆ இகாமத்',
          nameAr: 'إِقَامَةُ الْجُمُعَة',
          timeStr: todaySchedule.jummah_iqamah,
          instant: parseTime(todaySchedule.jummah_iqamah),
        }
      );
    } else {
      events.push(
        {
          prayerKey: 'dhuhr',
          type: 'azan',
          nameEn: 'Dhuhr Azan',
          nameTa: 'ளுஹர் பாங்கு',
          nameAr: 'أَذَانُ الظُّهْر',
          timeStr: todaySchedule.dhuhr_azan,
          instant: parseTime(todaySchedule.dhuhr_azan),
        },
        {
          prayerKey: 'dhuhr',
          type: 'iqamah',
          nameEn: 'Dhuhr Iqamah',
          nameTa: 'ளுஹர் இகாமத்',
          nameAr: 'إِقَامَةُ الظُّهْر',
          timeStr: todaySchedule.dhuhr_iqamah,
          instant: parseTime(todaySchedule.dhuhr_iqamah),
        }
      );
    }

    events.push(
      {
        prayerKey: 'asr',
        type: 'azan',
        nameEn: 'Asr Azan',
        nameTa: 'அஸர் பாங்கு',
        nameAr: 'أَذَانُ الْعَصْر',
        timeStr: todaySchedule.asr_azan,
        instant: parseTime(todaySchedule.asr_azan),
      },
      {
        prayerKey: 'asr',
        type: 'iqamah',
        nameEn: 'Asr Iqamah',
        nameTa: 'அஸர் இகாமத்',
        nameAr: 'إِقَامَةُ الْعَصْر',
        timeStr: todaySchedule.asr_iqamah,
        instant: parseTime(todaySchedule.asr_iqamah),
      },
      {
        prayerKey: 'maghrib',
        type: 'azan',
        nameEn: 'Maghrib Azan',
        nameTa: 'மஃரிப் பாங்கு',
        nameAr: 'أَذَانُ الْمَغْرِب',
        timeStr: todaySchedule.maghrib_azan,
        instant: parseTime(todaySchedule.maghrib_azan),
      },
      {
        prayerKey: 'maghrib',
        type: 'iqamah',
        nameEn: 'Maghrib Iqamah',
        nameTa: 'மஃரிப் இகாமத்',
        nameAr: 'إِقَامَةُ الْمَغْرِب',
        timeStr: todaySchedule.maghrib_iqamah,
        instant: parseTime(todaySchedule.maghrib_iqamah),
      },
      {
        prayerKey: 'isha',
        type: 'azan',
        nameEn: 'Isha Azan',
        nameTa: 'இஷா பாங்கு',
        nameAr: 'أَذَانُ الْعِشَاء',
        timeStr: todaySchedule.isha_azan,
        instant: parseTime(todaySchedule.isha_azan),
      },
      {
        prayerKey: 'isha',
        type: 'iqamah',
        nameEn: 'Isha Iqamah',
        nameTa: 'இஷா இகாமத்',
        nameAr: 'إِقَامَةُ الْعِشَاء',
        timeStr: todaySchedule.isha_iqamah,
        instant: parseTime(todaySchedule.isha_iqamah),
      }
    );

    return events.find((ev) => ev.instant.getTime() > now.getTime()) || null;
  }, [todaySchedule, todayDateStr, now]);

  // Countdown formatted string
  const countdownText = useMemo(() => {
    if (!nextEvent) return '--:--:--';
    const diffMs = nextEvent.instant.getTime() - now.getTime();
    if (diffMs <= 0) return '00:00:00';

    const totalSec = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, [nextEvent, now]);

  // Gregorian and approximate Hijri Date string
  const { formattedToday, hijriToday } = useMemo(() => {
    const [y, m, d] = todayDateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    const greg = dateObj.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let hijri = '';
    try {
      hijri = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(dateObj);
    } catch {
      hijri = '1447 AH';
    }

    return { formattedToday: greg, hijriToday: hijri };
  }, [todayDateStr, lang]);

  const urgentAnnouncement = announcements.find((a) => a.is_urgent);

  // Month navigation calculations
  const filteredMonthSchedules = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = String(viewDate.getMonth() + 1).padStart(2, '0');
    const prefix = `${y}-${m}-`;
    return monthSchedules
      .filter((s) => s.date.startsWith(prefix))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [monthSchedules, viewDate]);

  const monthLabel = useMemo(() => {
    return viewDate.toLocaleString(lang === 'ta' ? 'ta-IN' : 'default', {
      month: 'long',
      year: 'numeric',
    });
  }, [viewDate, lang]);

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const jumpToToday = () => {
    const [y, m] = todayDateStr.split('-').map(Number);
    setViewDate(new Date(y, m - 1, 1));
  };

  // Filter announcements by category
  const categories = [
    { key: 'all', label: lang === 'en' ? 'All' : 'அனைத்தும்' },
    { key: 'bayan', label: lang === 'en' ? 'Bayan' : 'பயான்' },
    { key: 'schedule_change', label: lang === 'en' ? 'Schedule' : 'நேர மாற்றம்' },
    { key: 'community', label: lang === 'en' ? 'Community' : 'சமூகம்' },
    { key: 'general', label: lang === 'en' ? 'General' : 'பொது' },
    { key: 'ramadan', label: lang === 'en' ? 'Ramadan' : 'ரமழான்' },
    { key: 'janazah', label: lang === 'en' ? 'Janazah' : 'ஜனாஸா' },
  ];

  const filteredAnnouncements = useMemo(() => {
    if (selectedCategory === 'all') return announcements;
    return announcements.filter((a) => a.category === selectedCategory);
  }, [announcements, selectedCategory]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstallModal(true);
    }
  };

  const handleTasbihTap = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(25);
    }
    const target = tasbihTarget === 0 ? Infinity : tasbihTarget;
    const next = tasbihCount + 1;
    if (next >= target) {
      setTasbihCount(0);
      setTasbihRounds((r) => r + 1);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([50, 40, 80]);
      }
      if (soundEnabled) {
        playChime();
      }
    } else {
      setTasbihCount(next);
    }
  };

  const handleTasbihReset = () => {
    setTasbihCount(0);
    setTasbihRounds(0);
  };

  const handleShare = async (title: string, body: string) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: `${title}\n\n${body}\n\n- ${masjidNameEn}`,
          url: window.location.href,
        });
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard?.writeText(`${title}\n\n${body}\n\n- ${masjidNameEn}`);
      alert(lang === 'en' ? 'Copied to clipboard' : 'நகலெடுக்கப்பட்டது');
    }
  };

  const activePrayerIndex = useMemo(() => {
    if (!nextEvent) return 5;
    return PRAYER_KEYS.findIndex((p) => p.key === nextEvent.prayerKey);
  }, [nextEvent]);

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col justify-between text-[#141716] relative selection:bg-[#0C4E31]/15">
      {/* 1. Inspo Floating-Pill Header (Pattern from _inspo-ref/apps/web/src/components/reference/nav/floating-pill.tsx) */}
      <header className="sticky top-0 z-40 bg-[#F8F6F1]/90 backdrop-blur-md px-4 sm:px-6 py-3 border-b border-[#E5E0D5]">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Identity */}
          <div className="min-w-0">
            <span className="font-arabic text-[#0C4E31] text-xs sm:text-sm font-bold block leading-none mb-1">
              {masjidNameAr}
            </span>
            <h1 className="text-sm sm:text-base font-extrabold text-[#141716] tracking-tight truncate">
              {lang === 'en' ? (
                <>
                  Masjidul <span className="font-serif italic font-normal text-[#0C4E31]">Ihsaan</span>
                </>
              ) : (
                masjidNameTa
              )}
            </h1>
          </div>

          {/* Desktop Floating Pill Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-[#ECE7DE]/70 p-1 rounded-full border border-[#E5E0D5]">
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition tap-bounce ${
                activeTab === 'home'
                  ? 'bg-white text-[#141716] shadow-sm'
                  : 'text-[#666B67] hover:text-[#141716]'
              }`}
            >
              {lang === 'en' ? 'Today' : 'இன்று'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timetable')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition tap-bounce ${
                activeTab === 'timetable'
                  ? 'bg-white text-[#141716] shadow-sm'
                  : 'text-[#666B67] hover:text-[#141716]'
              }`}
            >
              {lang === 'en' ? 'Timetable' : 'அட்டவணை'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('announcements')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition tap-bounce relative ${
                activeTab === 'announcements'
                  ? 'bg-white text-[#141716] shadow-sm'
                  : 'text-[#666B67] hover:text-[#141716]'
              }`}
            >
              {lang === 'en' ? 'Notices' : 'அறிவிப்புகள்'}
              {urgentAnnouncement && (
                <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-[#0C4E31]"></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tasbih')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition tap-bounce ${
                activeTab === 'tasbih'
                  ? 'bg-white text-[#141716] shadow-sm'
                  : 'text-[#666B67] hover:text-[#141716]'
              }`}
            >
              {lang === 'en' ? 'Tasbih' : 'தஸ்பீஹ்'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition tap-bounce ${
                activeTab === 'info'
                  ? 'bg-white text-[#141716] shadow-sm'
                  : 'text-[#666B67] hover:text-[#141716]'
              }`}
            >
              {lang === 'en' ? 'About' : 'விவரம்'}
            </button>
          </nav>

          {/* Right Controls: Audio chime + Qibla chip + Language Pill */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Audio prayer chime toggle */}
            <button
              type="button"
              onClick={toggleSound}
              title={soundEnabled ? 'Prayer chime active' : 'Enable prayer chime'}
              className={`p-2 rounded-full border transition tap-bounce ${
                soundEnabled
                  ? 'bg-[#EDF7F2] text-[#0C4E31] border-[#BDE3D2] shadow-sm'
                  : 'bg-white text-[#666B67] border-[#E5E0D5] hover:text-[#141716]'
              }`}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Qibla Direction Button */}
            <button
              type="button"
              onClick={() => setShowQiblaModal(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E0D5] hover:border-[#0C4E31] rounded-full text-[11px] font-semibold text-[#666B67] hover:text-[#141716] shadow-sm transition tap-bounce"
            >
              <Compass className="w-3.5 h-3.5 text-[#0C4E31]" />
              <span>Qibla 294°</span>
            </button>

            {/* Segmented Language Selector Pill */}
            <div className="flex items-center rounded-full bg-[#ECE7DE] p-0.5 border border-[#E5E0D5]">
              <button
                type="button"
                onClick={() => handleLangChange('en')}
                className={`px-3 py-1 text-[11px] font-bold rounded-full transition tap-bounce ${
                  lang === 'en'
                    ? 'bg-white text-[#141716] shadow-sm'
                    : 'text-[#666B67] hover:text-[#141716]'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLangChange('ta')}
                className={`px-3 py-1 text-[11px] font-bold rounded-full transition tap-bounce ${
                  lang === 'ta'
                    ? 'bg-white text-[#141716] shadow-sm'
                    : 'text-[#666B67] hover:text-[#141716]'
                }`}
              >
                தமிழ்
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Web App Install Notification Banner */}
      {!isStandalone && showInstallBanner && (
        <div className="bg-[#071912] text-[#F8F6F1] px-4 py-2.5 flex items-center justify-between border-b border-[#143827] text-xs">
          <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 pr-2">
              <Download className="w-3.5 h-3.5 text-[#8DAEA0] flex-shrink-0" />
              <span className="text-[12px] font-medium leading-tight">
                {lang === 'en'
                  ? 'Add Masjidul Ihsaan to your home screen for quick prayer times.'
                  : 'முகப்புத் திரையில் சேர்க்க செயலியை நிறுவவும்.'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleInstallClick}
                className="bg-white text-[#071912] font-bold px-3 py-1 rounded-full tap-bounce text-[11px]"
              >
                {lang === 'en' ? 'Install' : 'நிறுவு'}
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="text-[#8DAEA0] hover:text-white p-1"
                aria-label="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Screen View Switcher */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-12 space-y-6 overflow-y-auto">
        {/* ================= TAB 1: HOME ================= */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Urgent Notice Alert */}
            {urgentAnnouncement && (
              <div className="bg-white border-l-4 border-[#0C4E31] rounded-2xl p-4 border border-[#E5E0D5] shadow-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-[#EDF7F2] text-[#0C4E31] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-[#BDE3D2]">
                    {lang === 'en' ? 'Notice' : 'அறிவிப்பு'}
                  </span>
                  <h3 className="font-bold text-[#141716] text-xs truncate">
                    {lang === 'ta'
                      ? urgentAnnouncement.title_ta || urgentAnnouncement.title_en
                      : urgentAnnouncement.title_en || urgentAnnouncement.title_ta}
                  </h3>
                </div>
                <p className="text-xs text-[#666B67] line-clamp-2 leading-relaxed">
                  {lang === 'ta'
                    ? urgentAnnouncement.body_ta || urgentAnnouncement.body_en
                    : urgentAnnouncement.body_en || urgentAnnouncement.body_ta}
                </p>
              </div>
            )}

            {/* Inspo Bento Hero Architecture (features/bento.tsx pattern) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
              {/* Bento Lead Tile: Stat-Led Hero Card */}
              <div className="md:col-span-8 bg-gradient-to-br from-[#071912] via-[#0A241A] to-[#05140E] text-[#F8F6F1] rounded-2xl p-6 sm:p-7 border border-[#143827] shadow-[0_12px_32px_rgba(7,25,18,0.22)] relative overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs pb-3.5 border-b border-[#143827]">
                    <div>
                      <span className="text-[#8DAEA0] font-medium text-[12px] block">{formattedToday}</span>
                      <span className="text-[#8DAEA0]/75 text-[10px] font-mono mt-0.5 block">{hijriToday}</span>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0E3022] text-[#8DAEA0] text-[10px] font-bold tracking-wider uppercase border border-[#1B4B36]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse"></span>
                      {nextEvent ? (lang === 'en' ? 'Upcoming' : 'அடுத்து') : (lang === 'en' ? 'Completed' : 'நிறைவு')}
                    </span>
                  </div>

                  {/* Main Event Focus with Inspo Stat-Led Number */}
                  <div className="pt-5 pb-4">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[#8DAEA0] text-[11px] font-bold tracking-wider uppercase block">
                          {lang === 'en' ? 'Next Prayer' : 'அடுத்த தொழுகை'}
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
                          {nextEvent ? (lang === 'ta' ? nextEvent.nameTa : nextEvent.nameEn) : '--'}
                        </h2>
                      </div>
                      {nextEvent && (
                        <span className="font-arabic text-3xl font-bold text-[#8DAEA0]/90">
                          {nextEvent.nameAr}
                        </span>
                      )}
                    </div>

                    {/* Stat-Led Large Numerals */}
                    <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <span className="text-xs text-[#8DAEA0] block font-medium">
                          {nextEvent?.type === 'iqamah'
                            ? lang === 'en'
                              ? 'Iqamah Time'
                              : 'இகாமத் நேரம்'
                            : lang === 'en'
                            ? 'Azan Time'
                            : 'பாங்கு நேரம்'}
                        </span>
                        <span
                          className="font-extrabold text-white tabular-nums tracking-tight block"
                          style={{ fontSize: 'clamp(2.75rem, 5vw, 4.5rem)', lineHeight: '1' }}
                        >
                          {nextEvent ? nextEvent.timeStr.slice(0, 5) : '--:--'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-[#8DAEA0] block font-medium uppercase tracking-wider">
                          {lang === 'en' ? 'Remaining' : 'மீதமுள்ள நேரம்'}
                        </span>
                        <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                          {countdownText}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5-Prayer Timeline Bar */}
                <div className="pt-4 border-t border-[#143827] flex items-center justify-between text-[11px]">
                  {PRAYER_KEYS.map((p, idx) => {
                    const isCurrent = nextEvent?.prayerKey === p.key;
                    const isPast = idx < activePrayerIndex;

                    return (
                      <div key={p.key} className="flex flex-col items-center gap-1.5">
                        <span
                          className={`font-semibold text-[10px] sm:text-xs ${
                            isCurrent ? 'text-white' : isPast ? 'text-[#8DAEA0]' : 'text-[#8DAEA0]/50'
                          }`}
                        >
                          {lang === 'en' ? p.labelEn : p.labelTa}
                        </span>
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center transition ${
                            isCurrent
                              ? 'bg-white text-[#071912] ring-2 ring-[#34D399]'
                              : isPast
                              ? 'bg-[#0E3022] text-[#34D399]'
                              : 'bg-[#0C241B] text-transparent'
                          }`}
                        >
                          {isPast ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bento Side Column: Qibla Direction + Solar Milestones */}
              <div className="md:col-span-4 flex flex-col gap-4">
                {/* Qibla & Orientation Tile (Clickable to open Compass) */}
                <button
                  type="button"
                  onClick={() => setShowQiblaModal(true)}
                  className="bg-white rounded-2xl border border-[#E5E0D5] hover:border-[#0C4E31] p-5 shadow-sm space-y-2.5 flex-1 text-left transition tap-bounce group"
                >
                  <div className="flex items-center justify-between text-[#666B67]">
                    <span className="text-[10px] font-bold uppercase tracking-wider group-hover:text-[#0C4E31] transition">
                      {lang === 'en' ? 'Orientation • Live Qibla' : 'திசை • கிப்லா'}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-[#EDF7F2] text-[#0C4E31] flex items-center justify-center group-hover:scale-105 transition">
                      <Navigation className="w-3.5 h-3.5 rotate-[294deg]" />
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold text-[#141716] tabular-nums tracking-tight">
                      294° <span className="text-sm font-semibold text-[#666B67]">WNW</span>
                    </p>
                    <p className="text-xs text-[#666B67] mt-0.5">
                      {lang === 'en' ? 'Tap to open compass dial' : 'நேரலை திசைகாட்டி திறக்க தட்டவும்'}
                    </p>
                  </div>
                </button>

                {/* Solar Milestones Tile (Sunrise & Tahajjud) */}
                <div className="bg-white rounded-2xl border border-[#E5E0D5] p-5 shadow-sm space-y-3 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#666B67] block">
                    Solar Milestones
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sunrise className="w-4 h-4 text-[#0C4E31]" />
                        <span className="text-[#666B67]">Sunrise</span>
                      </div>
                      <span className="font-bold text-[#141716] tabular-nums">
                        {todaySchedule?.sunrise?.slice(0, 5) || '06:08'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#ECE7DE]">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4 text-[#666B67]" />
                        <span className="text-[#666B67]">Last 3rd of Night</span>
                      </div>
                      <span className="font-semibold text-[#141716] tabular-nums text-[11px]">
                        03:45 - 04:45
                      </span>
                    </div>
                  </div>
                </div>

                {/* Address & Navigation Action Tile */}
                <div className="bg-white rounded-2xl border border-[#E5E0D5] p-4 shadow-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#141716] truncate">{masjidNameEn}</p>
                    <p className="text-[11px] text-[#666B67] truncate mt-0.5">{address}</p>
                  </div>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-[#0C4E31] hover:bg-[#083823] text-white rounded-full transition tap-bounce flex-shrink-0"
                    title="Open in Maps"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Today's Prayer Schedule Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#141716] tracking-tight">
                  {lang === 'en' ? (
                    <>
                      Today&apos;s <span className="font-serif italic font-normal text-[#0C4E31]">Schedule</span>
                    </>
                  ) : (
                    'இன்றைய தொழுகை அட்டவணை'
                  )}
                </h3>
                <span className="text-xs font-medium text-[#666B67] tabular-nums">
                  {todayDateStr}
                </span>
              </div>

              {todaySchedule ? (
                <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm divide-y divide-[#ECE7DE] overflow-hidden">
                  {/* Fajr */}
                  <EditorialPrayerRow
                    name={lang === 'en' ? 'Fajr' : 'ஃபஜ்ர்'}
                    arabic="الفجر"
                    Icon={Sunrise}
                    azan={todaySchedule.fajr_azan}
                    iqamah={todaySchedule.fajr_iqamah}
                    isActive={nextEvent?.prayerKey === 'fajr'}
                    lang={lang}
                  />

                  {/* Sunrise Bar */}
                  {todaySchedule.sunrise && (
                    <div className="px-5 py-2.5 bg-[#F8F6F1] flex items-center justify-between text-xs text-[#666B67]">
                      <div className="flex items-center gap-2">
                        <Sunrise className="w-4 h-4 text-[#0C4E31]" />
                        <span className="font-semibold text-[11px]">
                          {lang === 'en' ? 'Sunrise' : 'சூரிய உதயம்'}
                        </span>
                      </div>
                      <span className="font-bold tabular-nums text-[#141716]">
                        {todaySchedule.sunrise.slice(0, 5)}
                      </span>
                    </div>
                  )}

                  {/* Dhuhr / Jumu'ah */}
                  <EditorialPrayerRow
                    name={
                      todaySchedule.jummah_iqamah
                        ? lang === 'en'
                          ? "Jumu'ah"
                          : 'ஜும்ஆ'
                        : lang === 'en'
                        ? 'Dhuhr'
                        : 'ளுஹர்'
                    }
                    arabic={todaySchedule.jummah_iqamah ? 'الجمعة' : 'الظهر'}
                    Icon={Sun}
                    azan={todaySchedule.jummah_azan || todaySchedule.dhuhr_azan}
                    iqamah={todaySchedule.jummah_iqamah || todaySchedule.dhuhr_iqamah}
                    bayan={todaySchedule.jummah_bayan || undefined}
                    isActive={nextEvent?.prayerKey === 'dhuhr'}
                    lang={lang}
                  />

                  {/* Asr */}
                  <EditorialPrayerRow
                    name={lang === 'en' ? 'Asr' : 'அஸர்'}
                    arabic="العصر"
                    Icon={Sun}
                    azan={todaySchedule.asr_azan}
                    iqamah={todaySchedule.asr_iqamah}
                    isActive={nextEvent?.prayerKey === 'asr'}
                    lang={lang}
                  />

                  {/* Maghrib */}
                  <EditorialPrayerRow
                    name={lang === 'en' ? 'Maghrib' : 'மஃரிப்'}
                    arabic="المغرب"
                    Icon={Sunset}
                    azan={todaySchedule.maghrib_azan}
                    iqamah={todaySchedule.maghrib_iqamah}
                    isActive={nextEvent?.prayerKey === 'maghrib'}
                    lang={lang}
                  />

                  {/* Isha */}
                  <EditorialPrayerRow
                    name={lang === 'en' ? 'Isha' : 'இஷா'}
                    arabic="العشاء"
                    Icon={Moon}
                    azan={todaySchedule.isha_azan}
                    iqamah={todaySchedule.isha_iqamah}
                    isActive={nextEvent?.prayerKey === 'isha'}
                    lang={lang}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-[#E5E0D5] p-8 text-center text-[#666B67] text-xs">
                  {lang === 'en'
                    ? 'Timetable not published for today'
                    : 'இன்றைய அட்டவணை வெளியிடப்படவில்லை'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: TIMETABLE ================= */}
        {activeTab === 'timetable' && (
          <div className="space-y-4">
            {/* Month Navigation Control */}
            <div className="bg-white rounded-2xl border border-[#E5E0D5] p-4 flex items-center justify-between shadow-sm">
              <button
                type="button"
                onClick={prevMonth}
                className="p-2 rounded-full text-[#141716] hover:bg-[#ECE7DE] transition tap-bounce"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <h3 className="font-extrabold text-sm sm:text-base text-[#141716]">{monthLabel}</h3>
                <button
                  type="button"
                  onClick={jumpToToday}
                  className="text-[11px] text-[#0C4E31] font-bold hover:underline"
                >
                  {lang === 'en' ? 'Jump to Today' : 'இன்றைய நாளுக்கு செல்ல'}
                </button>
              </div>
              <button
                type="button"
                onClick={nextMonth}
                className="p-2 rounded-full text-[#141716] hover:bg-[#ECE7DE] transition tap-bounce"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Monthly Calendar Schedule Table */}
            {filteredMonthSchedules.length > 0 ? (
              <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F8F6F1] text-[#666B67] text-[10px] uppercase font-bold tracking-wider border-b border-[#E5E0D5]">
                        <th className="py-3 px-3 text-center">Date</th>
                        <th className="py-3 px-2 text-center">Fajr</th>
                        <th className="py-3 px-2 text-center">Dhu/Jum</th>
                        <th className="py-3 px-2 text-center">Asr</th>
                        <th className="py-3 px-2 text-center">Magh</th>
                        <th className="py-3 px-2 text-center">Isha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ECE7DE] text-[#141716]">
                      {filteredMonthSchedules.map((row) => {
                        const isToday = row.date === todayDateStr;
                        const [y, m, d] = row.date.split('-').map(Number);
                        const dateObj = new Date(y, m - 1, d);
                        const isFriday = dateObj.getDay() === 5;
                        const dayNum = row.date.slice(8);
                        const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'narrow' });

                        return (
                          <tr
                            key={row.date}
                            className={`transition ${
                              isToday
                                ? 'bg-[#EDF7F2] font-bold text-[#0C4E31]'
                                : isFriday
                                ? 'bg-[#FCFBF8]'
                                : 'hover:bg-[#F8F6F1]'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center tabular-nums whitespace-nowrap">
                              <span className="font-bold text-[11px]">{dayNum}</span>
                              <span className="text-[9px] text-[#666B67] ml-1">{dayName}</span>
                              {isToday && (
                                <span className="inline-block w-1.5 h-1.5 bg-[#0C4E31] rounded-full ml-1"></span>
                              )}
                            </td>
                            <td className="py-2.5 px-2 text-center tabular-nums">
                              <div className="font-bold">{row.fajr_iqamah.slice(0, 5)}</div>
                              <div className="text-[9px] text-[#666B67]">{row.fajr_azan.slice(0, 5)}</div>
                            </td>
                            <td className="py-2.5 px-2 text-center tabular-nums">
                              {isFriday && row.jummah_iqamah ? (
                                <div className="font-bold text-[#0C4E31]">
                                  {row.jummah_iqamah.slice(0, 5)}
                                </div>
                              ) : (
                                <div className="font-bold">{row.dhuhr_iqamah.slice(0, 5)}</div>
                              )}
                              <div className="text-[9px] text-[#666B67]">
                                {(row.jummah_azan || row.dhuhr_azan).slice(0, 5)}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 text-center tabular-nums">
                              <div className="font-bold">{row.asr_iqamah.slice(0, 5)}</div>
                              <div className="text-[9px] text-[#666B67]">{row.asr_azan.slice(0, 5)}</div>
                            </td>
                            <td className="py-2.5 px-2 text-center tabular-nums">
                              <div className="font-bold">{row.maghrib_iqamah.slice(0, 5)}</div>
                              <div className="text-[9px] text-[#666B67]">{row.maghrib_azan.slice(0, 5)}</div>
                            </td>
                            <td className="py-2.5 px-2 text-center tabular-nums">
                              <div className="font-bold">{row.isha_iqamah.slice(0, 5)}</div>
                              <div className="text-[9px] text-[#666B67]">{row.isha_azan.slice(0, 5)}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E0D5] p-8 text-center text-[#666B67] space-y-2">
                <CalendarIcon className="w-8 h-8 text-[#949995] mx-auto" />
                <p className="text-sm font-bold text-[#141716]">
                  {lang === 'en' ? 'No Timetable Published' : 'அட்டவணை வெளியிடப்படவில்லை'}
                </p>
                <p className="text-xs text-[#666B67]">
                  {lang === 'en'
                    ? `Timetable for ${monthLabel} is not yet published.`
                    : `${monthLabel} க்கான அட்டவணை இன்னும் வெளியிடப்படவில்லை.`}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: ANNOUNCEMENTS ================= */}
        {activeTab === 'announcements' && (
          <div className="space-y-4">
            {/* Category Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((c) => {
                const isSelected = selectedCategory === c.key;
                return (
                  <button
                    key={c.key}
                    onClick={() => setSelectedCategory(c.key)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition tap-bounce ${
                      isSelected
                        ? 'bg-[#141716] text-white shadow-sm'
                        : 'bg-[#ECE7DE] text-[#666B67] hover:text-[#141716]'
                    }`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Announcements List */}
            {filteredAnnouncements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAnnouncements.map((ann) => {
                  const title =
                    lang === 'ta'
                      ? ann.title_ta || ann.title_en || ''
                      : ann.title_en || ann.title_ta || '';
                  const body =
                    lang === 'ta'
                      ? ann.body_ta || ann.body_en || ''
                      : ann.body_en || ann.body_ta || '';

                  return (
                    <div
                      key={ann.id}
                      className="bg-white rounded-2xl border border-[#E5E0D5] p-5 shadow-sm space-y-3 transition flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#ECE7DE] text-[#666B67] uppercase tracking-wider">
                            {ann.category.replace('_', ' ')}
                          </span>
                          {ann.event_at && (
                            <span className="text-[11px] text-[#949995] font-medium flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {new Date(ann.event_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        <h3 className="font-bold text-[#141716] text-sm leading-snug">
                          {title}
                        </h3>
                        <p className="text-xs text-[#666B67] leading-relaxed whitespace-pre-line">
                          {body}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[#ECE7DE] mt-2">
                        {ann.speaker_name ? (
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#0C4E31]">
                            <User className="w-3.5 h-3.5" />
                            <span>{ann.speaker_name}</span>
                          </div>
                        ) : (
                          <div></div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleShare(title, body)}
                          className="flex items-center gap-1 text-[11px] font-bold text-[#0C4E31] hover:text-[#083823] p-1 tap-bounce"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{lang === 'en' ? 'Share' : 'பகிர்'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E5E0D5] p-8 text-center text-[#666B67] space-y-2">
                <Bell className="w-8 h-8 text-[#949995] mx-auto" />
                <p className="text-sm font-bold text-[#141716]">
                  {lang === 'en' ? 'No Announcements' : 'அறிவிப்புகள் இல்லை'}
                </p>
                <p className="text-xs text-[#666B67]">
                  {lang === 'en'
                    ? 'No notices currently available in this category.'
                    : 'இந்த பிரிவில் தற்போது அறிவிப்புகள் இல்லை.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: TASBIH (DIGITAL DHIKR COUNTER) ================= */}
        {activeTab === 'tasbih' && (
          <div className="max-w-xl mx-auto space-y-5">
            {/* Dhikr Selector Horizontal Scroll */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {DHIKR_ITEMS.map((item, idx) => (
                <button
                  key={item.en}
                  type="button"
                  onClick={() => {
                    setSelectedDhikrIndex(idx);
                    setTasbihTarget(item.target);
                    setTasbihCount(0);
                  }}
                  className={`px-4 py-2 rounded-2xl text-xs font-semibold whitespace-nowrap transition tap-bounce border flex flex-col items-start gap-0.5 ${
                    selectedDhikrIndex === idx
                      ? 'bg-[#0C4E31] text-white border-[#0C4E31] shadow-sm'
                      : 'bg-white text-[#666B67] border-[#E5E0D5] hover:text-[#141716]'
                  }`}
                >
                  <span className="font-arabic text-xs font-bold leading-none">{item.ar}</span>
                  <span className="text-[11px] opacity-90">{lang === 'en' ? item.en : item.ta}</span>
                </button>
              ))}
            </div>

            {/* Main Interactive Counter Card */}
            <div className="bg-white rounded-3xl border border-[#E5E0D5] p-6 sm:p-8 shadow-sm text-center space-y-6">
              {/* Dhikr Phrase Display */}
              <div>
                <span className="font-arabic text-3xl sm:text-4xl font-extrabold text-[#0C4E31] block leading-relaxed">
                  {DHIKR_ITEMS[selectedDhikrIndex].ar}
                </span>
                <h3 className="text-lg font-bold text-[#141716] tracking-tight mt-1">
                  {lang === 'en' ? DHIKR_ITEMS[selectedDhikrIndex].en : DHIKR_ITEMS[selectedDhikrIndex].ta}
                </h3>
                <p className="text-xs text-[#666B67] mt-0.5">
                  {lang === 'en'
                    ? DHIKR_ITEMS[selectedDhikrIndex].meaningEn
                    : DHIKR_ITEMS[selectedDhikrIndex].meaningTa}
                </p>
              </div>

              {/* Target & Round Badges */}
              <div className="flex items-center justify-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#EDF7F2] text-[#0C4E31] text-[11px] font-bold border border-[#BDE3D2]">
                  {lang === 'en' ? 'Target' : 'இலக்கு'}: {tasbihTarget === 0 ? 'Free' : tasbihTarget}
                </span>
                {tasbihRounds > 0 && (
                  <span className="px-3 py-1 rounded-full bg-[#ECE7DE] text-[#141716] text-[11px] font-bold">
                    {lang === 'en' ? 'Rounds Completed' : 'சுற்றுகள்'}: {tasbihRounds}
                  </span>
                )}
              </div>

              {/* Large Ergonomic Touch Counter Button */}
              <div className="flex justify-center py-2">
                <button
                  type="button"
                  onClick={handleTasbihTap}
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-b from-[#0C4E31] to-[#083823] text-white flex flex-col items-center justify-center shadow-[0_12px_28px_rgba(12,78,49,0.32)] active:scale-95 transition-transform duration-100 relative group select-none"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Increment Tasbih count"
                >
                  <span className="text-[11px] uppercase font-bold tracking-widest text-[#8DAEA0]">
                    {lang === 'en' ? 'Tap' : 'தட்டவும்'}
                  </span>
                  <span className="text-6xl sm:text-7xl font-extrabold tabular-nums tracking-tight my-1">
                    {tasbihCount}
                  </span>
                  <span className="text-xs text-[#8DAEA0] font-medium">
                    / {tasbihTarget === 0 ? '∞' : tasbihTarget}
                  </span>
                </button>
              </div>

              {/* Counter Controls: Reset & Target presets */}
              <div className="flex items-center justify-between pt-4 border-t border-[#ECE7DE]">
                <div className="flex items-center gap-1.5">
                  {[33, 99, 100, 0].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTasbihTarget(t);
                        setTasbihCount(0);
                      }}
                      className={`px-3 py-1 rounded-full text-[11px] font-bold transition tap-bounce ${
                        tasbihTarget === t
                          ? 'bg-[#141716] text-white'
                          : 'bg-[#ECE7DE] text-[#666B67] hover:text-[#141716]'
                      }`}
                    >
                      {t === 0 ? 'Free' : t}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleTasbihReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#666B67] hover:text-red-700 hover:bg-red-50 transition tap-bounce"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{lang === 'en' ? 'Reset' : 'மீட்டமை'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: INFO / SETTINGS ================= */}
        {activeTab === 'info' && (
          <div className="max-w-xl mx-auto space-y-4">
            {/* Mosque Information Card */}
            <div className="bg-white rounded-2xl border border-[#E5E0D5] p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-[#666B67] uppercase tracking-wider">
                {lang === 'en' ? (
                  <>
                    Masjid <span className="font-serif italic font-normal text-[#0C4E31]">Details</span>
                  </>
                ) : (
                  'பள்ளிவாசல் விவரம்'
                )}
              </h3>
              <div className="space-y-2.5 text-xs text-[#141716]">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#0C4E31] flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[#666B67]">{address}</p>
                </div>
                {settings?.contact_phone && (
                  <a
                    href={`tel:${settings.contact_phone}`}
                    className="flex items-center gap-2.5 text-[#0C4E31] font-semibold hover:underline"
                  >
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{settings.contact_phone}</span>
                  </a>
                )}
              </div>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0C4E31] hover:bg-[#083823] text-white rounded-full text-xs font-bold transition tap-bounce shadow-sm mt-1"
              >
                <span>{lang === 'en' ? 'Open in Google Maps' : 'வரைபடத்தில் திறக்க'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Install Shortcut Card */}
            <div className="bg-white rounded-2xl border border-[#E5E0D5] p-5 shadow-sm space-y-2">
              <div className="flex items-center gap-2 text-[#141716]">
                <Download className="w-4 h-4 text-[#0C4E31]" />
                <h3 className="text-sm font-bold">
                  {lang === 'en' ? 'Install to Home Screen' : 'முகப்புத் திரையில் சேர்க்க'}
                </h3>
              </div>
              <p className="text-xs text-[#666B67] leading-relaxed">
                {lang === 'en'
                  ? 'Add this web application to your mobile home screen for instantaneous access to prayer schedules.'
                  : 'தொழுகை நேரங்களை உடனடியாக அறிய இந்த செயலியை உங்கள் மொபைல் முகப்புத் திரையில் சேர்க்கவும்.'}
              </p>
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-2.5 bg-[#141716] hover:bg-black text-white rounded-full text-xs font-bold transition tap-bounce mt-1"
              >
                {lang === 'en' ? 'Add Shortcut' : 'செயலியைச் சேர்க்கவும்'}
              </button>
            </div>

            {/* Grouped Links */}
            <div className="bg-white rounded-2xl border border-[#E5E0D5] shadow-sm divide-y divide-[#ECE7DE] overflow-hidden">
              <Link
                href="/privacy"
                className="flex items-center justify-between p-3.5 text-xs font-medium text-[#141716] hover:bg-[#F8F6F1] transition"
              >
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-[#666B67]" />
                  <span>{lang === 'en' ? 'Privacy Policy' : 'தனியுரிமைக் கொள்கை'}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#949995]" />
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-between p-3.5 text-xs font-medium text-[#141716] hover:bg-[#F8F6F1] transition"
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-[#666B67]" />
                  <span>{lang === 'en' ? 'Admin Portal Login' : 'நிர்வாக உள்நுழைவு'}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#949995]" />
              </Link>
            </div>

            <div className="text-center pt-2">
              <p className="text-[11px] text-[#949995] font-medium">
                {masjidNameEn} &bull; {new Date().getFullYear()}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 4. Docked Native Tab Navigation Bar (Visible on Mobile only, md:hidden) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-[#E5E0D5] px-4 py-2 flex items-center justify-around z-40 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
        {/* Tab 1: Home */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-full transition tap-bounce ${
            activeTab === 'home' ? 'text-[#0C4E31]' : 'text-[#666B67] hover:text-[#141716]'
          }`}
        >
          <Clock className="w-5 h-5" />
          <span className="text-[10px] font-bold">
            {lang === 'en' ? 'Home' : 'முகப்பு'}
          </span>
        </button>

        {/* Tab 2: Timetable */}
        <button
          type="button"
          onClick={() => setActiveTab('timetable')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-full transition tap-bounce ${
            activeTab === 'timetable' ? 'text-[#0C4E31]' : 'text-[#666B67] hover:text-[#141716]'
          }`}
        >
          <CalendarIcon className="w-5 h-5" />
          <span className="text-[10px] font-bold">
            {lang === 'en' ? 'Timetable' : 'அட்டவணை'}
          </span>
        </button>

        {/* Tab 3: Announcements */}
        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-full transition tap-bounce relative ${
            activeTab === 'announcements' ? 'text-[#0C4E31]' : 'text-[#666B67] hover:text-[#141716]'
          }`}
        >
          <Bell className="w-5 h-5" />
          {urgentAnnouncement && (
            <span className="absolute top-1 right-2.5 w-2 h-2 bg-[#0C4E31] rounded-full"></span>
          )}
          <span className="text-[10px] font-bold">
            {lang === 'en' ? 'Notices' : 'அறிவிப்பு'}
          </span>
        </button>

        {/* Tab 4: Tasbih */}
        <button
          type="button"
          onClick={() => setActiveTab('tasbih')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-full transition tap-bounce ${
            activeTab === 'tasbih' ? 'text-[#0C4E31]' : 'text-[#666B67] hover:text-[#141716]'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] font-bold">
            {lang === 'en' ? 'Tasbih' : 'தஸ்பீஹ்'}
          </span>
        </button>

        {/* Tab 5: Info */}
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-full transition tap-bounce ${
            activeTab === 'info' ? 'text-[#0C4E31]' : 'text-[#666B67] hover:text-[#141716]'
          }`}
        >
          <Info className="w-5 h-5" />
          <span className="text-[10px] font-bold">
            {lang === 'en' ? 'Info' : 'விவரம்'}
          </span>
        </button>
      </nav>

      {/* 5. Modal: Interactive Qibla Compass Dial */}
      {showQiblaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5E0D5] p-6 max-w-sm w-full shadow-2xl space-y-5 text-center relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setShowQiblaModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-[#666B67] hover:bg-[#ECE7DE] transition tap-bounce"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="bg-[#EDF7F2] text-[#0C4E31] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-[#BDE3D2]">
                Qibla Bearing
              </span>
              <h3 className="text-xl font-extrabold text-[#141716] mt-1.5">
                294° <span className="text-sm font-semibold text-[#666B67]">WNW</span>
              </h3>
              <p className="text-xs text-[#666B67] mt-0.5">
                From Sithalapakkam, Chennai to Kaaba, Makkah (~4,400 km)
              </p>
            </div>

            {/* Compass Dial Graphic */}
            <div className="flex justify-center py-2">
              <div className="relative w-52 h-52 rounded-full border-4 border-[#ECE7DE] bg-gradient-to-b from-[#F8F6F1] to-[#ECE7DE]/50 flex items-center justify-center shadow-inner">
                {/* Degree indicators */}
                <span className="absolute top-2 text-[10px] font-extrabold text-[#141716]">N (0°)</span>
                <span className="absolute right-3 text-[10px] font-bold text-[#666B67]">E (90°)</span>
                <span className="absolute bottom-2 text-[10px] font-bold text-[#666B67]">S (180°)</span>
                <span className="absolute left-2 text-[10px] font-bold text-[#666B67]">W (270°)</span>

                {/* Kaaba Direction Needle */}
                <div
                  className="w-full h-full absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out"
                  style={{
                    transform: `rotate(${deviceHeading !== null ? (294 - deviceHeading) : 294}deg)`,
                  }}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-4 h-4 bg-[#0C4E31] rounded-full ring-4 ring-[#34D399] flex items-center justify-center shadow-md">
                      <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
                    </div>
                    <div className="w-1 h-20 bg-gradient-to-b from-[#0C4E31] to-transparent rounded-full"></div>
                  </div>
                </div>

                {/* Center Hub */}
                <div className="w-8 h-8 rounded-full bg-white border border-[#E5E0D5] flex items-center justify-center shadow-sm z-10">
                  <Navigation className="w-4 h-4 text-[#0C4E31]" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-[#666B67]">
              <p className="font-semibold text-[#141716]">
                {deviceHeading !== null
                  ? `Device Heading: ${deviceHeading}°`
                  : 'Turn device towards 294° West-Northwest'}
              </p>
              <p className="text-[11px]">
                {deviceHeading !== null
                  ? 'Sensor active. Orient your phone until the needle points upward.'
                  : 'Hold your phone flat and face slightly north of west.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowQiblaModal(false)}
              className="w-full py-2.5 bg-[#141716] text-white rounded-full text-xs font-bold tap-bounce"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* 6. Modal: Add to Home Screen Instructions */}
      {showInstallModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E5E0D5] p-6 max-w-sm w-full shadow-2xl space-y-5 text-left relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-[#666B67] hover:bg-[#ECE7DE] transition tap-bounce"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0C4E31] text-white flex items-center justify-center shadow-sm flex-shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-[#141716] text-base">
                  {lang === 'en' ? 'Add to Home Screen' : 'முகப்புத் திரையில் சேர்க்க'}
                </h3>
                <p className="text-xs text-[#666B67]">
                  {lang === 'en' ? 'Instant Web App Installation' : 'உடனடி இணையச் செயலி'}
                </p>
              </div>
            </div>

            {/* Instruction Steps */}
            <div className="space-y-3 bg-[#F8F6F1] rounded-2xl p-4 border border-[#ECE7DE] text-xs">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#0C4E31] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </span>
                <p className="text-[#141716]">
                  {lang === 'en' ? (
                    <>
                      Tap your browser&apos;s <strong>Share</strong> icon (iOS) or <strong>Menu (⋮)</strong> (Android/Chrome).
                    </>
                  ) : (
                    <>உலாவியின் <strong>Share</strong> அல்லது <strong>Menu (⋮)</strong> பொத்தானைத் தட்டவும்.</>
                  )}
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#0C4E31] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </span>
                <p className="text-[#141716]">
                  {lang === 'en' ? (
                    <>
                      Scroll down and tap <strong>&apos;Add to Home Screen&apos;</strong> or <strong>&apos;Install App&apos;</strong>.
                    </>
                  ) : (
                    <><strong>&apos;Add to Home Screen&apos;</strong> அல்லது <strong>&apos;Install App&apos;</strong> என்பதைத் தேர்ந்தெடுக்கவும்.</>
                  )}
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#0C4E31] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </span>
                <p className="text-[#141716]">
                  {lang === 'en' ? (
                    <>Tap <strong>&apos;Add&apos;</strong> in the top-right corner to finish.</>
                  ) : (
                    <>மேல் மூலையிலுள்ள <strong>&apos;Add&apos;</strong> என்பதைத் தட்டி முடிக்கவும்.</>
                  )}
                </p>
              </div>
            </div>

            {/* Features check list */}
            <div className="space-y-1.5 text-[11px] text-[#666B67]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0C4E31] flex-shrink-0" />
                <span>Works offline inside the masjid with cached schedules</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0C4E31] flex-shrink-0" />
                <span>Zero store downloads or manual APK updates required</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              className="w-full py-2.5 bg-[#0C4E31] text-white rounded-full text-xs font-bold tap-bounce"
            >
              {lang === 'en' ? 'Got It' : 'புரிந்தது'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditorialPrayerRow({
  name,
  arabic,
  Icon,
  azan,
  iqamah,
  bayan,
  isActive,
  lang,
}: {
  name: string;
  arabic: string;
  Icon: LucideIcon;
  azan: string;
  iqamah: string;
  bayan?: string;
  isActive: boolean;
  lang: 'en' | 'ta';
}) {
  return (
    <div
      className={`relative px-5 py-4 flex items-center justify-between transition ${
        isActive ? 'bg-[#EDF7F2]' : 'bg-white hover:bg-[#FAF9F6]'
      }`}
    >
      {/* Active Indicator Bar on left edge */}
      {isActive && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0C4E31]"></div>
      )}

      {/* Prayer Icon, Name & Arabic Label */}
      <div className="flex items-center gap-3.5">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition ${
            isActive
              ? 'bg-[#0C4E31] text-white shadow-sm'
              : 'bg-[#F8F6F1] text-[#666B67]'
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>

        <div>
          <div className="flex items-center gap-2.5">
            <h4
              className={`text-sm sm:text-base font-bold tracking-tight ${
                isActive ? 'text-[#0C4E31]' : 'text-[#141716]'
              }`}
            >
              {name}
            </h4>
            <span
              className={`font-arabic text-xs sm:text-sm font-semibold ${
                isActive ? 'text-[#0C4E31]' : 'text-[#949995]'
              }`}
            >
              {arabic}
            </span>
          </div>

          {bayan && (
            <p className="text-[10px] sm:text-[11px] font-bold text-[#0C4E31] mt-0.5">
              {lang === 'en' ? 'Bayan' : 'பயான்'}: {(bayan || '').slice(0, 5)}
            </p>
          )}
        </div>
      </div>

      {/* Azan and Iqamah Columns */}
      <div className="flex items-center gap-6 sm:gap-8">
        {/* Azan Time Column */}
        <div className="text-right">
          <p className="text-[9px] uppercase font-bold text-[#949995] tracking-wider">
            {lang === 'en' ? 'Azan' : 'பாங்கு'}
          </p>
          <p className="text-xs sm:text-sm font-semibold text-[#666B67] tabular-nums mt-0.5">
            {(azan || '').slice(0, 5)}
          </p>
        </div>

        {/* Iqamah Time Column */}
        <div className="text-right min-w-[64px]">
          <p className="text-[9px] uppercase font-bold text-[#949995] tracking-wider">
            {lang === 'en' ? 'Iqamah' : 'இகாமத்'}
          </p>
          <p
            className={`text-base sm:text-lg font-extrabold tabular-nums mt-0.5 ${
              isActive ? 'text-[#0C4E31]' : 'text-[#141716]'
            }`}
          >
            {(iqamah || '').slice(0, 5)}
          </p>
        </div>
      </div>
    </div>
  );
}
