/**
 * Original portal mark: a sprouting seedling under a rising sun inside a shield-like roundel.
 * Deliberately NOT a national or state emblem, so the portal never implies official ownership.
 */
export function LogoMark({ className = 'h-10 w-10' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="22" fill="none" stroke="#e8c66a" strokeWidth="1.6" />
      <g stroke="#e8c66a" strokeWidth="1.6" strokeLinecap="round">
        {[-60, -35, -12, 12, 35, 60].map((a) => (
          <line key={a} x1="24" y1="20" x2="24" y2="9" transform={`rotate(${a} 24 22)`} />
        ))}
      </g>
      <path d="M14 22 A10 10 0 0 1 34 22 Z" fill="#e8c66a" opacity="0.9" />
      <path d="M24 38 V26" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M24 30 C18 30 15 26 15 22 C20 22 24 25 24 30 Z" fill="#ffffff" />
      <path d="M24 28 C30 28 33 24 33 20 C28 20 24 23 24 28 Z" fill="#ffffff" />
      <path d="M13 38 H35" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
