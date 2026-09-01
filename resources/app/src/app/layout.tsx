import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
// Loaded *after* globals.css so the mobile/tablet layer wins on equal
// specificity without needing !important everywhere.
import './mobile.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s — SolarERP',
    default: 'SolarERP — Premium Enterprise Platform',
  },
  description: 'Premium ERP and Business Management system.',
  keywords: ['SolarERP', 'ERP', 'Management', 'Pakistan'],
  authors: [{ name: 'SolarERP' }],
  openGraph: {
    type: 'website',
    title: 'SolarERP — Premium Enterprise Platform',
    description: 'Premium ERP and Business Management system.',
  },
};

export const dynamic = 'force-dynamic';

import LicenseGuard from '@/components/LicenseGuard';
import MobileShell from '@/components/mobile/MobileShell';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Pinch-to-zoom is deliberately allowed: invoices and dense
            ledgers must remain inspectable at print scale, and locking
            zoom is an accessibility regression. viewport-fit=cover
            enables the env(safe-area-inset-*) padding used throughout
            mobile.css. */}
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <Script
          id="theme-script"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  if (theme === 'dark') {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('SW registered successfully:', reg.scope);
                  }).catch(function(err) {
                    console.warn('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.variable} suppressHydrationWarning>
        <LicenseGuard>{children}</LicenseGuard>
        <MobileShell />
      </body>
    </html>
  );
}
