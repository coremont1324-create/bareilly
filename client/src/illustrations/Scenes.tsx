/** Original decorative illustrations used across the portal. All are aria-hidden. */

export function FarmerScene({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 150" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8f3ff" />
          <stop offset="1" stopColor="#d7ecf7" />
        </linearGradient>
      </defs>
      <rect width="320" height="150" rx="14" fill="url(#fs-sky)" />
      <circle cx="262" cy="34" r="14" fill="#ffd56b" />
      <g fill="#fff">
        <ellipse cx="80" cy="30" rx="26" ry="8" />
        <ellipse cx="98" cy="24" rx="16" ry="9" />
        <ellipse cx="200" cy="44" rx="20" ry="6" />
      </g>
      <path d="M0 104 C70 88 140 96 200 90 C250 86 290 92 320 88 L320 150 L0 150 Z" fill="#9fd27a" />
      <path d="M0 118 C80 108 160 116 320 104 L320 150 L0 150 Z" fill="#6fb24f" />
      <g stroke="#4b8f35" strokeWidth="2" opacity="0.7">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <path key={i} d={`M${30 + i * 40} 150 Q ${40 + i * 40} 128 ${60 + i * 34} 118`} fill="none" />
        ))}
      </g>
      {/* house */}
      <g transform="translate(218 64)">
        <rect x="6" y="22" width="56" height="36" fill="#fff7ea" stroke="#c9b28f" />
        <path d="M0 24 L34 0 L68 24 Z" fill="#d9573b" />
        <rect x="27" y="36" width="14" height="22" fill="#8a5a3c" />
        <rect x="12" y="32" width="10" height="9" fill="#9cd3f0" />
        <rect x="46" y="32" width="10" height="9" fill="#9cd3f0" />
      </g>
      {/* trees */}
      <g>
        <rect x="296" y="78" width="4" height="22" fill="#7a5638" />
        <circle cx="298" cy="72" r="12" fill="#3f8f45" />
        <rect x="186" y="84" width="3" height="16" fill="#7a5638" />
        <circle cx="187.5" cy="80" r="9" fill="#4ea153" />
      </g>
      {/* farmer */}
      <g transform="translate(118 38)">
        <ellipse cx="30" cy="10" rx="24" ry="6" fill="#d7a645" />
        <path d="M18 10 Q30 -6 42 10 Z" fill="#e0b453" />
        <circle cx="30" cy="20" r="10" fill="#b47a4f" />
        <path d="M14 34 Q30 26 46 34 L48 72 L12 72 Z" fill="#2e7d8c" />
        <rect x="16" y="70" width="12" height="30" rx="3" fill="#2f3f5c" />
        <rect x="32" y="70" width="12" height="30" rx="3" fill="#2f3f5c" />
        <path d="M46 40 L64 30" stroke="#b47a4f" strokeWidth="6" strokeLinecap="round" />
        <path d="M66 6 L58 106" stroke="#8a5a3c" strokeWidth="4" strokeLinecap="round" />
        <path d="M52 100 L66 108 L60 112 Z" fill="#7d8a96" />
      </g>
      {/* plants */}
      <g fill="#2f8a3e">
        {[40, 70, 96].map((x) => (
          <g key={x} transform={`translate(${x} 112)`}>
            <path d="M0 18 Q-10 6 -2 0 Q2 8 0 18" />
            <path d="M0 18 Q10 6 4 -2 Q-2 8 0 18" />
          </g>
        ))}
      </g>
    </svg>
  );
}

export function FieldBanner({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 420 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfeef8" />
          <stop offset="1" stopColor="#f3f1dc" />
        </linearGradient>
        <linearGradient id="fb-field" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8fbf5a" />
          <stop offset="1" stopColor="#3f7d2c" />
        </linearGradient>
        <linearGradient id="fb-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="420" height="160" fill="url(#fb-sky)" />
      <path d="M0 78 C100 70 200 76 420 66 L420 160 L0 160 Z" fill="url(#fb-field)" />
      <g stroke="#2f6a22" strokeOpacity="0.4" strokeWidth="1.6">
        {Array.from({ length: 16 }, (_, i) => (
          <line key={i} x1="300" y1="72" x2={-200 + i * 50} y2="160" />
        ))}
      </g>
      <rect x="368" y="40" width="5" height="34" fill="#6b4b31" />
      <circle cx="370" cy="36" r="18" fill="#3e8a3f" />
      {/* farmer silhouette with turban */}
      <g transform="translate(262 34)" fill="#3b4a3a">
        <ellipse cx="22" cy="8" rx="15" ry="7" fill="#e7d6b0" />
        <circle cx="22" cy="18" r="8" fill="#9b6b48" />
        <path d="M8 30 Q22 22 36 30 L38 70 L6 70 Z" fill="#f4efe2" />
        <rect x="10" y="68" width="10" height="34" fill="#cfc6b0" />
        <rect x="24" y="68" width="10" height="34" fill="#cfc6b0" />
      </g>
      <rect width="420" height="160" fill="url(#fb-fade)" />
    </svg>
  );
}

export function ForestBanner({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fo-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#21483f" />
          <stop offset="1" stopColor="#5f8f6a" />
        </linearGradient>
      </defs>
      <rect width="1200" height="300" fill="url(#fo-sky)" />
      <path d="M0 150 C200 110 360 140 520 120 C700 96 880 138 1200 108 L1200 300 L0 300 Z" fill="#3d6b4f" opacity="0.8" />
      <path d="M0 190 C180 160 380 196 600 170 C820 146 1000 186 1200 160 L1200 300 L0 300 Z" fill="#2c5a3d" />
      <g fill="#1d4430">
        {Array.from({ length: 34 }, (_, i) => {
          const x = i * 37;
          const h = 40 + (i % 5) * 14;
          return <path key={i} d={`M${x} ${230} l18 -${h} l18 ${h} z`} />;
        })}
      </g>
      <path d="M0 240 C300 222 600 250 1200 230 L1200 300 L0 300 Z" fill="#163826" />
      <g fill="#ffffff" opacity="0.07">
        <ellipse cx="300" cy="170" rx="260" ry="14" />
        <ellipse cx="900" cy="150" rx="300" ry="12" />
      </g>
    </svg>
  );
}

export function Sprig({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M32 62 C32 44 30 30 22 16" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M30 40 C18 40 10 32 8 22 C20 22 28 28 30 40 Z" fill="currentColor" opacity="0.75" />
      <path d="M31 32 C40 28 46 18 44 6 C34 10 30 20 31 32 Z" fill="currentColor" opacity="0.9" />
      <path d="M32 52 C44 52 52 46 56 36 C44 34 36 40 32 52 Z" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
