"use client";

import dynamic from "next/dynamic";

/** Loads the 3D viewer only in the browser and only on pages that use it (keeps three.js off other pages). */
export const ViewerLoader = dynamic(() => import("./equipment-viewer").then((m) => m.InteractiveEquipmentViewer), {
  ssr: false,
  loading: () => <div className="h-[440px] animate-pulse rounded-2xl border border-white/10 bg-white/5 sm:h-[540px]" />,
});
