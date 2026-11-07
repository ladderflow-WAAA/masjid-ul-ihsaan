import { MasjidSettings, PrayerSchedule, Announcement } from './types';

export const fallbackSettings: MasjidSettings = {
  id: 1,
  name_en: 'Masjidul Ihsaan',
  name_ta: 'மஸ்ஜிதுல் இஹ்சான்',
  name_ar: 'مَسْجِدُ الْإِحْسَانِ',
  address: 'Skylab Avenue, Sithalapakkam, Tambaram, Tamil Nadu 600045, India',
  maps_url: 'https://maps.app.goo.gl/wPgTiSDwAh24Xoa49',
  latitude: 12.894208,
  longitude: 80.1898496,
  timezone: 'Asia/Kolkata',
  contact_phone: '+91 94440 12345',
  latest_version: '1.0.0',
  apk_url: 'https://github.com/ladderflow/masjid-app/releases/latest/download/masjidul-ihsaan.apk',
  updated_at: new Date().toISOString(),
};

export function generatePrayerSchedule(dateStr: string): PrayerSchedule {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const isFriday = dateObj.getDay() === 5;

  return {
    date: dateStr,
    fajr_azan: '05:05',
    fajr_iqamah: '05:30',
    sunrise: '06:08',
    dhuhr_azan: '12:15',
    dhuhr_iqamah: '12:45',
    asr_azan: '15:45',
    asr_iqamah: '16:15',
    maghrib_azan: '17:55',
    maghrib_iqamah: '18:05',
    isha_azan: '19:15',
    isha_iqamah: '19:45',
    jummah_bayan: isFriday ? '12:45' : null,
    jummah_azan: isFriday ? '13:00' : null,
    jummah_iqamah: isFriday ? '13:30' : null,
    note_en: isFriday ? "Special Jumu'ah gathering" : null,
    note_ta: isFriday ? 'சிறப்பு ஜும்ஆ தொழுகை' : null,
  };
}

export function generateMonthSchedules(currentDateStr: string): PrayerSchedule[] {
  const [y, m] = currentDateStr.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const schedules: PrayerSchedule[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    schedules.push(generatePrayerSchedule(dayStr));
  }

  return schedules;
}

const nowIso = new Date().toISOString();

export const fallbackAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    title_en: "Special Jumu'ah Bayan by Moulana Abdul Rahman",
    title_ta: 'மௌலானா அப்துர் ரஹ்மான் அவர்களின் சிறப்பு ஜும்ஆ பயான்',
    body_en:
      'Join us this Friday at 12:45 PM for an inspiring discourse on "Sincerity in Daily Worship & Community Bonds". All brothers are requested to arrive early for Sunnah prayers.',
    body_ta:
      'இன்ஷா அல்லாஹ் இந்த வெள்ளிக்கிழமை மதியம் 12:45 மணிக்கு "நாளாந்த வணக்கங்களில் இஹ்லாஸ்" என்ற தலைப்பில் சிறப்புரை நிகழவுள்ளது. அனைவரும் முன்கூட்டியே வருமாறு அன்புடன் அழைக்கிறோம்.',
    speaker_name: 'Moulana Abdul Rahman Nadwi',
    event_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    category: 'bayan',
    banner_url: null,
    is_urgent: true,
    is_published: true,
    published_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    push_requested: false,
    push_sent_at: null,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: 'ann-2',
    title_en: 'Weekend Maktab & Tajweed Classes for Children',
    title_ta: 'சிறுவர்களுக்கான வார இறுதி மக்தப் & தஜ்வீத் வகுப்புகள்',
    body_en:
      'Registration is open for basic Quran recitation, Tajweed rules, and foundational Islamic etiquette for children aged 6 to 14. Classes run every Saturday and Sunday from 8:00 AM to 10:00 AM.',
    body_ta:
      '6 முதல் 14 வயதுக்குட்பட்ட சிறுவர் சிறுமிகளுக்கான குர்ஆன் ஓதுதல் மற்றும் அடிப்படை இஸ்லாமிய ஒழுக்கப் பயிற்சிகள் வாரந்தோறும் சனி மற்றும் ஞாயிறு காலை 8:00 முதல் 10:00 வரை நடைபெறும். சேர்க்கை நடைபெறுகிறது.',
    speaker_name: 'Ustad Bilal Ahmed',
    event_at: null,
    category: 'community',
    banner_url: null,
    is_urgent: false,
    is_published: true,
    published_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    push_requested: false,
    push_sent_at: null,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: 'ann-3',
    title_en: 'Daily 10-Minute Hadith Reflection after Asr',
    title_ta: 'அஸர் தொழுகைக்குப் பின் தினசரி 10 நிமிட ஹதீஸ் வாசிப்பு',
    body_en:
      'A short, uplifting reading from Riyadhus Saliheen takes place immediately following the Asr prayer every evening. Please take a few moments to stay and benefit.',
    body_ta:
      'ரியாளுஸ் ஸாலிஹீன் நூலிலிருந்து தினமும் அஸர் தொழுகைக்குப் பின் பத்து நிமிட நற்சிந்தனை நடைபெறும். அனைவரும் கலந்துகொண்டு பயன் பெறவும்.',
    speaker_name: 'Imam of Masjidul Ihsaan',
    event_at: null,
    category: 'general',
    banner_url: null,
    is_urgent: false,
    is_published: true,
    published_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    push_requested: false,
    push_sent_at: null,
    created_at: nowIso,
    updated_at: nowIso,
  },
  {
    id: 'ann-4',
    title_en: 'Community Cleanliness & Maintenance Drive',
    title_ta: 'பள்ளிவாசல் தூய்மை மற்றும் பராமரிப்புப் பணி',
    body_en:
      'Volunteers are warmly invited this coming Sunday after Fajr prayer for our monthly masjid and garden beautification effort. Light refreshments will be served.',
    body_ta:
      'வரும் ஞாயிற்றுக்கிழமை ஃபஜ்ர் தொழுகைக்குப் பின் பள்ளிவாசல் மற்றும் வளாக தூய்மைப் பணிகள் நடைபெறும். தன்னார்வலர்கள் கலந்துகொள்ளுமாறு கேட்டுக்கொள்ளப்படுகிறார்கள்.',
    speaker_name: 'Masjid Committee',
    event_at: new Date(Date.now() + 86400000 * 4).toISOString(),
    category: 'community',
    banner_url: null,
    is_urgent: false,
    is_published: true,
    published_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    push_requested: false,
    push_sent_at: null,
    created_at: nowIso,
    updated_at: nowIso,
  },
];
