/**
 * Original, 3D-inspired service illustrations drawn in the brand palette (isometric layers with soft
 * light and shadow). Purely decorative: aria-hidden.
 */
export function MaintenanceIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 200" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="mi-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ECEAFF" />
        </linearGradient>
        <linearGradient id="mi-wrench" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5B44FF" />
          <stop offset="1" stopColor="#2D13EA" />
        </linearGradient>
        <filter id="mi-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#2D13EA" floodOpacity="0.22" />
        </filter>
      </defs>
      <ellipse cx="120" cy="176" rx="82" ry="12" fill="#2D13EA" opacity="0.08" />
      {/* platform */}
      <g filter="url(#mi-shadow)">
        <path d="M120 70 200 112 120 154 40 112Z" fill="url(#mi-top)" />
        <path d="M40 112v14l80 42v-14Z" fill="#D9D5FF" />
        <path d="M200 112v14l-80 42v-14Z" fill="#9C94FF" />
      </g>
      {/* toolbox */}
      <g className="fh-float" style={{ transformOrigin: "120px 100px" }}>
        <path d="M86 92 122 74 158 92 122 110Z" fill="#FF7800" />
        <path d="M86 92v26l36 18v-26Z" fill="#E86C00" />
        <path d="M158 92v26l-36 18v-26Z" fill="#C95D00" />
        <path d="M108 83c0-6 28-6 28 0" fill="none" stroke="#1D1D1D" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
        <path d="M86 104 122 122 158 104" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" />
      </g>
      {/* wrench */}
      <g transform="rotate(-38 160 58)">
        <rect x="152" y="40" width="14" height="62" rx="7" fill="url(#mi-wrench)" />
        <path d="M159 18a18 18 0 1 0 0.1 0Zm-6 10h12v14h-12Z" fill="url(#mi-wrench)" fillRule="evenodd" />
        <rect x="155" y="48" width="3" height="46" rx="1.5" fill="#ffffff" opacity="0.35" />
      </g>
      {/* gear */}
      <g transform="translate(58 46)">
        <circle r="17" fill="#ffffff" stroke="#9C94FF" strokeWidth="6" strokeDasharray="7 5.3" />
        <circle r="6" fill="#2D13EA" />
      </g>
      <rect x="196" y="64" width="9" height="9" rx="1.5" transform="rotate(45 200 68)" fill="#FF7800" />
    </svg>
  );
}

export function CleaningIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 200" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="ci-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ECEAFF" />
        </linearGradient>
        <linearGradient id="ci-bottle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7A6BFF" />
          <stop offset="1" stopColor="#2D13EA" />
        </linearGradient>
        <filter id="ci-shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#2D13EA" floodOpacity="0.2" />
        </filter>
      </defs>
      <ellipse cx="120" cy="176" rx="82" ry="12" fill="#2D13EA" opacity="0.08" />
      <g filter="url(#ci-shadow)">
        <path d="M120 70 200 112 120 154 40 112Z" fill="url(#ci-top)" />
        <path d="M40 112v14l80 42v-14Z" fill="#D9D5FF" />
        <path d="M200 112v14l-80 42v-14Z" fill="#9C94FF" />
      </g>
      {/* bucket */}
      <g>
        <ellipse cx="78" cy="98" rx="20" ry="8" fill="#FF9878" />
        <path d="M58 98l4 26c1 6 31 6 32 0l4-26c0 5-40 5-40 0Z" fill="#FF7800" />
        <ellipse cx="78" cy="98" rx="15" ry="5" fill="#40E2D2" opacity="0.8" />
      </g>
      {/* spray bottle */}
      <g className="fh-float" style={{ transformOrigin: "136px 90px" }}>
        <path d="M122 70h26l6 14v44c0 6-4 10-10 10h-18c-6 0-10-4-10-10V84Z" fill="url(#ci-bottle)" />
        <rect x="126" y="56" width="18" height="14" rx="3" fill="#1D1D1D" opacity="0.8" />
        <path d="M144 58h18l-4 8h-14Z" fill="#1D1D1D" opacity="0.8" />
        <rect x="124" y="92" width="22" height="26" rx="5" fill="#ffffff" opacity="0.9" />
        <rect x="129" y="99" width="12" height="3" rx="1.5" fill="#9C94FF" />
        <rect x="129" y="106" width="8" height="3" rx="1.5" fill="#FF7800" />
        <rect x="125" y="76" width="4" height="50" rx="2" fill="#ffffff" opacity="0.25" />
      </g>
      {/* mist + sparkles */}
      <g fill="#9C94FF">
        <circle cx="172" cy="58" r="3" opacity="0.7" />
        <circle cx="182" cy="50" r="2.4" opacity="0.5" />
        <circle cx="180" cy="64" r="2" opacity="0.45" />
      </g>
      <path d="M190 80l3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#FF7800" />
      <path d="M58 54l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#2D13EA" />
      <path d="M204 40l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6Z" fill="#40E2D2" />
    </svg>
  );
}
