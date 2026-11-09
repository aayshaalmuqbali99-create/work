/**
 * Original vector illustration: a teacher and students running an experiment on lab equipment.
 * A placeholder until real photos from partner labs are added.
 */
export function LabIllustration({ title }: { title: string }) {
  const sockets = ["#c0392b", "#202326", "#e2b33c", "#2f6fb3", "#c0392b", "#202326"];
  return (
    <svg viewBox="0 0 640 440" role="img" aria-label={title} className="h-auto w-full">
      <defs>
        <linearGradient id="lab-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#163a5c" />
          <stop offset="1" stopColor="#0d2440" />
        </linearGradient>
        <linearGradient id="lab-bench" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9e3e7" />
          <stop offset="1" stopColor="#aebcc3" />
        </linearGradient>
        <radialGradient id="lab-glow" cx="0.5" cy="0.4" r="0.6">
          <stop offset="0" stopColor="#3FB8BE" stopOpacity="0.35" />
          <stop offset="1" stopColor="#3FB8BE" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="640" height="440" fill="url(#lab-wall)" />
      <rect width="640" height="440" fill="url(#lab-glow)" />

      {/* whiteboard with waveforms */}
      <rect x="48" y="42" width="250" height="132" rx="10" fill="#f4f7f8" />
      <path className="ls-trace" d="M64 108 C 84 108 84 70 104 70 S 124 146 144 146 S 164 70 184 70 S 204 146 224 146 S 244 108 284 108" fill="none" stroke="#167d83" strokeWidth="4" strokeLinecap="round" />
      <path d="M64 160 H120 V140 H176 V160 H232 V140 H284" fill="none" stroke="#1b6fd1" strokeWidth="3" />

      {/* shelf with equipment */}
      <rect x="380" y="78" width="220" height="10" rx="4" fill="#5d7387" />
      <rect x="392" y="40" width="70" height="38" rx="5" fill="#d5dbdf" />
      <rect x="400" y="48" width="34" height="20" rx="2" fill="#0b2a33" />
      <rect x="474" y="46" width="54" height="32" rx="5" fill="#2f6fb3" />
      <circle cx="550" cy="58" r="16" fill="#3FB8BE" opacity="0.9" />
      <rect x="572" y="36" width="22" height="42" rx="4" fill="#e2b33c" />

      {/* teacher: standing, pointing at the board */}
      <g>
        <rect x="318" y="150" width="62" height="150" rx="26" fill="#f4f7f8" />
        <path d="M330 162 L 302 122" stroke="#f4f7f8" strokeWidth="16" strokeLinecap="round" />
        <circle cx="298" cy="117" r="8" fill="#c99872" />
        <circle cx="349" cy="128" r="22" fill="#c99872" />
        <path d="M327 122 a22 22 0 0 1 44 0 z" fill="#ffffff" />
        <rect x="326" y="114" width="46" height="9" rx="4" fill="#ffffff" stroke="#d6e9e8" />
        <rect x="343" y="150" width="12" height="80" rx="3" fill="#d6e9e8" />
      </g>

      {/* bench */}
      <rect x="20" y="300" width="600" height="26" rx="8" fill="url(#lab-bench)" />
      <rect x="40" y="326" width="18" height="114" fill="#8193a0" />
      <rect x="582" y="326" width="18" height="114" fill="#8193a0" />

      {/* trainer module */}
      <rect x="110" y="250" width="170" height="50" rx="6" fill="#eef1f2" />
      {sockets.map((c, i) => (
        <circle key={i} cx={128 + i * 24} cy={268} r="5" fill={c} />
      ))}
      <rect x="236" y="276" width="34" height="18" rx="2" fill="#202326" />
      <path d="M128 268 C 150 230 230 230 252 285" fill="none" stroke="#c0392b" strokeWidth="3" />

      {/* oscilloscope */}
      <rect x="400" y="226" width="150" height="74" rx="8" fill="#d5dbdf" />
      <rect x="410" y="236" width="80" height="54" rx="4" fill="#071a24" />
      <path className="ls-trace" d="M414 263 C 424 263 424 244 434 244 S 444 282 454 282 S 464 244 474 244 S 484 263 488 263" fill="none" stroke="#3FB8BE" strokeWidth="3" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx="518" cy={246 + i * 18} r="6" fill="#1f2b33" />
      ))}

      {/* student 1 (hijab) at the trainer */}
      <g>
        <path d="M159 226 a26 26 0 0 1 52 0 v42 h-52z" fill="#3b4a6b" />
        <ellipse cx="185" cy="236" rx="13" ry="16" fill="#c99872" />
        <rect x="156" y="262" width="58" height="50" rx="22" fill="#1b6fd1" />
        <rect x="150" y="300" width="70" height="90" rx="28" fill="#1b6fd1" />
        <path d="M208 282 L 234 272" stroke="#c99872" strokeWidth="9" strokeLinecap="round" />
      </g>

      {/* student 2 (kumma) at the oscilloscope */}
      <g>
        <circle cx="467" cy="232" r="21" fill="#a8774f" />
        <path d="M446 228 a21 21 0 0 1 42 0 z" fill="#167d83" />
        <path d="M446 228 h42" stroke="#d6e9e8" strokeWidth="3" />
        <rect x="440" y="252" width="56" height="58" rx="22" fill="#f4f7f8" />
        <rect x="430" y="300" width="74" height="90" rx="28" fill="#f4f7f8" />
        <path d="M444 280 L 420 268" stroke="#a8774f" strokeWidth="9" strokeLinecap="round" />
      </g>

      {/* floating badge */}
      <g className="ls-float">
        <rect x="474" y="126" width="128" height="40" rx="20" fill="#ffffff" opacity="0.95" />
        <circle cx="496" cy="146" r="10" fill="#3FB8BE" />
        <rect x="514" y="140" width="72" height="12" rx="6" fill="#102f40" opacity="0.8" />
      </g>
    </svg>
  );
}
