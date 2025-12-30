/**
 * AutoForge Root Layout
 * 
 * File: src/app/layout.tsx
 * 
 * Root layout with providers and global styles
 */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/providers';
import Header from '@/components/header';
import { AnimatedBackground, Starfield } from '@/components/cosmic-background';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'AutoForge - AI-Powered App Generation',
  description: 'Generate production-ready Next.js applications from a single prompt. Beautiful UI, working code, instant preview.',
  keywords: ['AI', 'code generation', 'Next.js', 'React', 'TypeScript', 'app builder'],
  authors: [{ name: 'AutoForge' }],
  creator: 'AutoForge',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://autoforge.dev',
    title: 'AutoForge - AI-Powered App Generation',
    description: 'Generate production-ready Next.js applications from a single prompt.',
    siteName: 'AutoForge',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AutoForge - AI-Powered App Generation',
    description: 'Generate production-ready Next.js applications from a single prompt.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0A0A0B',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-black text-white min-h-screen`}>
        <AnimatedBackground />
        <Starfield />
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
