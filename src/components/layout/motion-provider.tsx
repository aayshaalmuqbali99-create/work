"use client";

import { MotionConfig } from "motion/react";

/** Global animation settings. `reducedMotion="user"` honours the OS reduced-motion preference. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
