"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";
import { getArchetype } from "@/components/viewer3d/archetypes";
import type { SceneState } from "@/components/viewer3d/scene";
import { HeroVisual } from "./hero-visual";

const EquipmentScene = dynamic(() => import("@/components/viewer3d/scene").then((m) => m.EquipmentScene), { ssr: false });

/**
 * Homepage 3D: an illustrative training module that slowly turns and takes itself apart.
 * Loaded only on larger screens with WebGL; phones get the lightweight animated picture.
 */
export function HeroModel({ locale }: { locale: "ar" | "en" }) {
  const reduced = !!useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [exploded, setExploded] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1024px)").matches;
    let gl = false;
    try {
      const c = document.createElement("canvas");
      gl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      gl = false;
    }
    setEnabled(wide && gl);
  }, []);

  useEffect(() => {
    if (!enabled || reduced) return;
    const id = setInterval(() => setExploded((e) => !e), 3800);
    return () => clearInterval(id);
  }, [enabled, reduced]);

  const archetype = getArchetype("training-board");
  if (!enabled || !archetype) return <HeroVisual />;

  const state: SceneState = {
    exploded,
    paused: false,
    speed: 0.8,
    distance: 0.85,
    selected: null,
    hidden: new Set(),
    showLabels: false,
    autoRotate: !reduced,
    locale,
    view: { preset: "iso", nonce: 0 },
  };
  return (
    <div className="relative aspect-[5/4] w-full">
      <EquipmentScene model={{ type: "illustrative", archetype }} state={state} onSelect={() => undefined} reducedMotion={reduced} dark interactive={false} />
    </div>
  );
}
