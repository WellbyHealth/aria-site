import './globals.css';
import type { ReactNode } from 'react';
export const metadata = {
  metadataBase: new URL('https://cfo-hub-jade.vercel.app'),
  title: 'Aria', description: 'Your financial suite for healthcare practices. Accounts, cards, buy-and-bill lending and bill pay.', robots: { index: false },
  openGraph: { type: 'website', siteName: 'Aria', title: 'Aria: radically different banking for healthcare', description: 'Your financial suite for healthcare practices.', images: [{ url: '/og.png?v=22', width: 1200, height: 630, alt: 'Aria: radically different banking for healthcare' }] },
  twitter: { card: 'summary_large_image', title: 'Aria: radically different banking for healthcare', description: 'Your financial suite for healthcare practices.', images: ['/og.png?v=22'] },
};
export default function Root({ children }: { children: ReactNode }) {
  return (<html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" /><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" /></head><body>{children}</body></html>);
}
