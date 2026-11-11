import './globals.css';
import type { ReactNode } from 'react';
export const metadata = { title: 'Aria CFO Hub', description: 'Every location’s money in one view.', robots: { index: false } };
export default function Root({ children }: { children: ReactNode }) {
  return (<html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" /><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" /></head><body>{children}</body></html>);
}
