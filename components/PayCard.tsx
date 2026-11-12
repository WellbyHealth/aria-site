// Aria Card art for the app: white card like the site's spend-controls panel, or the dark physical card.
import { Logo } from './Logo';
export function PayCard({ name, mask, status = 'Active', dark = false }: { name: string; mask: string; status?: string; dark?: boolean }) {
  return (
    <div className={'paycard' + (dark ? ' dark' : '')}>
      <div className="pc-top"><span className={'pc-st' + (status === 'Frozen' ? ' frozen' : '')}><i />{status}</span><Logo size={26} /></div>
      <div className="pc-chip" />
      <div className="pc-foot"><b>{name}</b><span className="num">•••• •••• •••• {mask}</span></div>
    </div>
  );
}
