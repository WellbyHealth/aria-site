// The Aria card mark, same as the website.
export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <defs><linearGradient id="aria-card-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8f86f0" /><stop offset="1" stopColor="#f0a3c8" /></linearGradient></defs>
      <g transform="rotate(-14 50 50)"><rect x="8" y="22" width="84" height="56" rx="12" fill="url(#aria-card-g)" /><rect x="18" y="36" width="17" height="13" rx="3.5" fill="#f2c94c" /><g fill="#fff"><rect x="68" y="54" width="8" height="18" rx="4" /><rect x="63" y="59" width="18" height="8" rx="4" /></g></g>
    </svg>
  );
}
