"use client";

import dynamic from "next/dynamic";

/** Loads the 3D viewer only in the browser and only on pages that use it (keeps three.js off other pages). */
export const ViewerLoader = dynamic(() => import("./equipment-viewer").then((m) => m.InteractiveEquipmentViewer), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-card border border-line bg-teal-light/40 sm:h-[520px]" />,
});
