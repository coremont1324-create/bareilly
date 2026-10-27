/** Original illustration: sunrise over farmland with converging crop rows. */
export function HeroLandscape({ className = '' }: { className?: string }) {
  const rows = Array.from({ length: 22 }, (_, i) => i);
  return (
    <svg className={className} viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#142a4d" />
          <stop offset="0.42" stopColor="#7a4a52" />
          <stop offset="0.68" stopColor="#d9844a" />
          <stop offset="0.8" stopColor="#f5c26b" />
        </linearGradient>
        <radialGradient id="hl-glow" cx="0.7" cy="0.64" r="0.45">
          <stop offset="0" stopColor="#fff2c4" stopOpacity="0.95" />
          <stop offset="0.25" stopColor="#ffd27a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hl-field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6c7d2c" />
          <stop offset="0.35" stopColor="#3f6a22" />
          <stop offset="1" stopColor="#1d3d14" />
        </linearGradient>
        <radialGradient id="hl-fieldlight" cx="0.7" cy="0" r="0.8">
          <stop offset="0" stopColor="#f6c76b" stopOpacity="0.55" />
          <stop offset="1" stopColor="#f6c76b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1200" height="420" fill="url(#hl-sky)" />
      <rect width="1200" height="420" fill="url(#hl-glow)" />
      {/* soft clouds */}
      <g fill="#f8d9a8" opacity="0.12">
        <ellipse cx="300" cy="110" rx="160" ry="14" />
        <ellipse cx="980" cy="150" rx="190" ry="12" />
        <ellipse cx="640" cy="80" rx="120" ry="9" />
      </g>
      <circle cx="840" cy="262" r="34" fill="#fff4cf" />
      {/* distant hills */}
      <path d="M0 262 C150 240 260 250 380 244 C520 236 640 254 760 250 C900 244 1040 236 1200 248 L1200 280 L0 280 Z" fill="#4a4a3e" opacity="0.75" />
      {/* tree line */}
      <g fill="#2a3324">
        {Array.from({ length: 40 }, (_, i) => (
          <ellipse key={i} cx={i * 31 + (i % 3) * 7} cy={268 - (i % 4) * 3} rx={12 + (i % 5) * 3} ry={9 + (i % 4) * 3} />
        ))}
        <rect x="0" y="266" width="1200" height="14" />
      </g>
      {/* fields */}
      <path d="M0 276 L1200 276 L1200 420 L0 420 Z" fill="url(#hl-field)" />
      <path d="M0 276 L1200 276 L1200 420 L0 420 Z" fill="url(#hl-fieldlight)" />
      <g stroke="#8fb24a" strokeOpacity="0.45" strokeWidth="2.2">
        {rows.map((i) => {
          const x = -900 + i * 140;
          return <line key={i} x1="840" y1="278" x2={x} y2="420" />;
        })}
      </g>
      <g stroke="#e9c46a" strokeOpacity="0.18" strokeWidth="1.2">
        {[292, 310, 334, 366, 404].map((y) => (
          <line key={y} x1="0" y1={y} x2="1200" y2={y} />
        ))}
      </g>
      {/* foreground grass tufts */}
      <g fill="#183410">
        {Array.from({ length: 60 }, (_, i) => (
          <path key={i} d={`M${i * 20} 420 l6 -${18 + (i % 4) * 6} l6 ${18 + (i % 4) * 6} z`} />
        ))}
      </g>
    </svg>
  );
}
