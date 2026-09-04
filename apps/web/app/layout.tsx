import { SerwistProvider } from '@serwist/turbopack/react';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { NavBar } from './components/nav-bar';
import './globals.css';

// Inter, auto-hébergée (jamais via un CDN tiers — performance et RGPD).
// Variable en amont, mais on ne charge que les 4 graisses réellement
// utilisées par l'échelle typographique du design system.
const inter = localFont({
  src: [
    { path: './fonts/Inter-Regular.woff2', weight: '400', style: 'normal' },
    { path: './fonts/Inter-Medium.woff2', weight: '500', style: 'normal' },
    { path: './fonts/Inter-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: './fonts/Inter-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'UrbanFlow Mobility',
  description:
    'Mobilité urbaine multimodale à Toulouse — itinéraires, empreinte carbone et récompenses.',
};

export const viewport: Viewport = {
  themeColor: '#14589c',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={inter.variable}>
      <body>
        <SerwistProvider swUrl="/serwist/sw.js">
          <NavBar />
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
