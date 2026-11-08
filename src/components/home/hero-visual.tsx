/**
 * Decorative hero illustration: a stylised instrument screen with a live trace.
 * Purely illustrative (aria-hidden) — it does not represent any inventory product.
 */
export function HeroVisual() {
  return (
    <div aria-hidden="true" className="relative mx-auto aspect-[5/4] w-full max-w-lg">
      <div className="absolute inset-6 rounded-[28px] bg-teal/20 blur-3xl" />
      <div className="relative h-full rounded-[28px] border border-white/10 bg-gradient-to-br from-navy to-[#0b2230] p-5 shadow-2xl shadow-navy/30">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-teal" />
            <span className="size-2.5 rounded-full bg-white/20" />
            <span className="size-2.5 rounded-full bg-white/20" />
          </div>
          <span dir="ltr" className="font-mono text-[11px] tracking-widest text-teal-light/70">CH1 · 2.00 V/div · 1 ms</span>
        </div>
        <div className="relative h-[62%] overflow-hidden rounded-2xl border border-white/10 bg-[#071a24]">
          <svg viewBox="0 0 400 200" className="absolute inset-0 size-full" preserveAspectRatio="none">
            {Array.from({ length: 9 }).map((_, i) => (
              <line key={`v${i}`} x1={(i + 1) * 40} x2={(i + 1) * 40} y1="0" y2="200" stroke="#ffffff" strokeOpacity="0.06" />
            ))}
            {Array.from({ length: 4 }).map((_, i) => (
              <line key={`h${i}`} y1={(i + 1) * 40} y2={(i + 1) * 40} x1="0" x2="400" stroke="#ffffff" strokeOpacity="0.06" />
            ))}
            <path className="ls-trace" fill="none" stroke="#3FB8BE" strokeWidth="2.5" strokeLinecap="round"
              d="M0 100 C 25 100 25 40 50 40 S 75 160 100 160 S 125 40 150 40 S 175 160 200 160 S 225 40 250 40 S 275 160 300 160 S 325 40 350 40 S 375 100 400 100" />
            <path fill="none" stroke="#D6E9E8" strokeOpacity="0.45" strokeWidth="1.5"
              d="M0 150 H60 V120 H120 V150 H180 V120 H240 V150 H300 V120 H360 V150 H400" />
          </svg>
          <div className="ls-scan absolute inset-y-0 start-8 w-px bg-teal-light/40" />
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-2 rounded-xl bg-white/5 py-3">
              <span className="size-7 rounded-full border-2 border-teal-light/40 bg-white/5" />
              <span className="h-1 w-8 rounded bg-white/15" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
