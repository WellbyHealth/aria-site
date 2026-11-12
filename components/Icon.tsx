// Line icons, safe to use from client and server components.
const PATHS: Record<string, string> = {
  overview: 'M3 13h4v8H3zM10 3h4v18h-4zM17 8h4v13h-4z',
  revenue: 'M4 19V5M4 19h16M8 15l4-4 3 3 5-6',
  payers: 'M3 21V9l9-6 9 6v12M9 21v-7h6v7',
  providers: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  costs: 'M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  cash: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  risk: 'M12 3l9 4v5c0 5-4 8-9 9-5-1-9-4-9-9V7z',
  data: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  bank: 'M3 10h18M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18M12 3l9 5H3z',
  card: 'M3 6h18v12H3zM3 10h18',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  watch: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v6l4 2',
  check: 'M4 12l5 5L20 6',
  plug: 'M9 3v5M15 3v5M6 8h12v4a6 6 0 0 1-12 0zM12 18v3',
  chev: 'M9 6l6 6-6 6',
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  eyeoff: 'M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  plus: 'M12 5v14M5 12h14',
  send: 'M4 12l16-8-6 16-3-7z',
  arrowup: 'M7 17L17 7M9 7h8v8',
  arrowdown: 'M7 7l10 10M17 9v8H9',
  logout: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3',
};
export function Icon({ name, size = 16 }: { name: keyof typeof PATHS | string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: '-2px' }}><path d={PATHS[name] || ''} /></svg>;
}
