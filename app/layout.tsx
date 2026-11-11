import './globals.css';
import type { ReactNode } from 'react';
export const metadata = { title: 'Aria CFO Hub', description: 'Every location’s money in one view.', robots: { index: false } };
export default function Root({ children }: { children: ReactNode }) {
  return (<html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400..800&display=swap" /></head><body>{children}</body></html>);
}
