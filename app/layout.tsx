import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';
import './brand-media.css';

const display = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700']
});

const ui = Inter({
  subsets: ['latin'],
  variable: '--font-ui'
});

export const metadata: Metadata = {
  title: 'RAFAY — Private Event & Creator Booking',
  description: 'Premium 18+ event companionship, hosting and creator appearance booking.',
  metadataBase: new URL('https://rafay.example')
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${ui.variable}`}>
      <body>{children}</body>
    </html>
  );
}
