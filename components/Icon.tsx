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
};
export function Icon({ name, size = 16 }: { name: keyof typeof PATHS | string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: '-2px' }}><path d={PATHS[name] || ''} /></svg>;
}
