import type { Metadata } from 'next';
import { DM_Sans, Manrope } from 'next/font/google';
import './globals.css';

const body = DM_Sans({ variable: '--font-body', subsets: ['latin'] });
const display = Manrope({ variable: '--font-display', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cycling Goals Intelligence',
  description: 'See exactly how far ahead or behind your cycling goals you are—and the daily pace to finish on target.',
  openGraph: {
    title: 'Cycling Goals Intelligence',
    description: 'Know what today needs from you.',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'Cycling Goals Intelligence' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cycling Goals Intelligence',
    description: 'Know what today needs from you.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${body.variable} ${display.variable}`}>{children}</body></html>;
}
