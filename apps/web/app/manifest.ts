import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'UrbanFlow Mobility',
    short_name: 'UrbanFlow',
    description:
      'Mobilité urbaine multimodale à Toulouse — itinéraires, empreinte carbone et récompenses.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#14589c',
    lang: 'fr',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
