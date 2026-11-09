"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type Slide = { url: string; width: number; height: number };

/** Cross-fading background photos with dots. Auto-advances unless the user prefers reduced motion. */
export function HeroCarousel({ slides, alt }: { slides: Slide[]; alt: string }) {
  const t = useTranslations("Hero");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length < 2 || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [slides.length, paused]);

  return (
    <div className="absolute inset-0 -z-10" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, i) => (
        <Image
          key={s.url}
          src={s.url}
          alt={i === index ? alt : ""}
          aria-hidden={i !== index}
          fill
          priority={i === 0}
          sizes="100vw"
          className={cn("object-cover transition-opacity duration-1000 ease-out", i === index ? "opacity-100" : "opacity-0")}
        />
      ))}
      {slides.length > 1 && (
        <div className="absolute bottom-5 end-6 z-10 flex gap-2" role="group" aria-label={t("slide", { n: index + 1 })}>
          {slides.map((s, i) => (
            <button
              key={s.url}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={t("slide", { n: i + 1 })}
              aria-current={i === index}
              className={cn("h-2.5 rounded-full transition-all", i === index ? "w-7 bg-[#3b82f6]" : "w-2.5 bg-white/70 hover:bg-white")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
