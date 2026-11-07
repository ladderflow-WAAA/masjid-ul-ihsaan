import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Masjidul Ihsaan',
    short_name: 'Masjid App',
    description: 'Prayer Timetable & Announcements for Masjidul Ihsaan, Sithalapakkam',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A1F17',
    theme_color: '#0A1F17',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/adaptive-icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

