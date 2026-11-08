"use client";

import { MotionConfig } from "motion/react";

/**
 * Global animation settings. `reducedMotion="user"` honours the OS reduced-motion preference;
 * the website editor can switch animations off entirely.
 */
export function MotionProvider({ children, animations = true }: { children: React.ReactNode; animations?: boolean }) {
  return <MotionConfig reducedMotion={animations ? "user" : "always"}>{children}</MotionConfig>;
}
