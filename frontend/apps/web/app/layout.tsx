import { Inter } from 'next/font/google';
import { Metadata } from 'next';

import { Providers } from './providers';
import { RootLayout } from '../src/components/layout/RootLayout';
import { PerformanceDashboard, PerformanceDashboardToggle } from '../src/components/performance/PerformanceDashboard';
import { SEOHead } from '../src/components/seo';
import { generateMetadata as generateSEOMetadata } from '../src/lib/seo';

import '../src/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  ...generateSEOMetadata({
    title: 'DataTourisme - Découvrez la France Authentique',
    description: 'Explorez les trésors cachés de la France avec DataTourisme. Découvrez des expériences authentiques, des hébergements uniques et des activités inoubliables partout en France.',
    canonical: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
    ogImage: {
      url: '/og-image.png',
      width: 1200,
      height: 630,
      alt: 'DataTourisme - Découvrez la France Authentique',
    },
  }),
  title: {
    template: '%s | DataTourisme',
    default: 'DataTourisme - Découvrez la France Authentique',
  },
  authors: [{ name: 'DataTourisme Team' }],
  creator: 'DataTourisme',
  publisher: 'DataTourisme',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
};

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <SEOHead />
      </head>
      <body className={inter.className}>
        <Providers>
          <RootLayout>{children}</RootLayout>
          <PerformanceDashboard />
          <PerformanceDashboardToggle />
        </Providers>
      </body>
    </html>
  );
}