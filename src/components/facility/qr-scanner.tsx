"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "motion/react";
import { QrCode, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => Detector;
  }
}

/** Extract the Facility Hub token from a scanned value (only our own /facility/q/<token> links are accepted). */
export function tokenFromScan(value: string): string | null {
  try {
    const u = new URL(value, window.location.origin);
    const m = u.pathname.match(/\/facility\/q\/([a-z0-9]{10,40})$/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

/** In-app QR scanning (BarcodeDetector + camera). Falls back to guidance to use the phone's camera app. */
export function QrScanButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const t = useTranslations("Fac.Home");
  const tn = useTranslations("Fac.Nav");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"starting" | "scanning" | "unsupported" | "denied" | "invalid">("starting");
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
  }, []);

  useEffect(() => {
    if (!open) return stop;
    let cancelled = false;
    (async () => {
      if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) return setState("unsupported");
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        return setState("denied");
      }
      if (cancelled || !video.current) return stop();
      video.current.srcObject = stream.current;
      await video.current.play().catch(() => {});
      setState("scanning");
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const loop = async () => {
        if (cancelled || !video.current) return;
        try {
          const codes = await detector.detect(video.current);
          for (const c of codes) {
            const token = tokenFromScan(c.rawValue);
            if (token) {
              stop();
              setOpen(false);
              router.push(`/facility/q/${token}`);
              return;
            }
            setState("invalid");
          }
        } catch {
          /* frame not ready */
        }
        setTimeout(loop, 250);
      };
      loop();
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, router, stop]);

  return (
    <>
      <button type="button" className={className} onClick={() => { setState("starting"); setOpen(true); }}>
        {children}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-deep/40 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="fh-qr-title"
              initial={{ y: 24, scale: 0.97 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 24, scale: 0.97 }}
              className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-lift"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 id="fh-qr-title" className="flex items-center gap-2 text-lg font-bold"><QrCode className="size-5 text-deep" /> {t("qrTitle")}</h2>
                <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full hover:bg-lav-50" aria-label={tn("close")}>
                  <X className="size-5" />
                </button>
              </div>
              <div className="relative mt-4 aspect-square overflow-hidden rounded-3xl bg-lav-50">
                <video ref={video} className="size-full object-cover" muted playsInline />
                {state === "scanning" && <div className="pointer-events-none absolute inset-10 rounded-3xl border-4 border-white/90 shadow-[0_0_0_999px_rgb(45_19_234/0.25)]" />}
                {state !== "scanning" && (
                  <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-fmuted">
                    <p>{state === "starting" ? t("qrHint") : t(state === "unsupported" ? "qrUnsupported" : state === "denied" ? "qrDenied" : "qrInvalid")}</p>
                  </div>
                )}
              </div>
              <p className="mt-3 text-center text-sm text-fmuted">{state === "invalid" ? t("qrInvalid") : t("qrHint")}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
