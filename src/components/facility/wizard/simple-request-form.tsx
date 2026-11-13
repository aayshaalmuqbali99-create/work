"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Camera, CheckCircle2, ImagePlus, Loader2, Send, Sparkles, Wrench, X } from "lucide-react";
import type { FacPriority, FacService } from "@prisma/client";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { WizardConfig } from "@/features/facility/server/queries";
import { submitRequestAction } from "@/features/facility/actions/requests";
import { detectSafetyRisks } from "@/features/facility/domain/safety";
import { areasForWing, issueAppliesTo, locationTrail, PICKABLE_KINDS, WING_UNSURE } from "@/features/facility/domain/location";
import { MAX_PHOTOS, MAX_PHOTO_MB } from "@/features/facility/constants";
import { pickName } from "@/features/facility/format";
import { FieldError, fhBtn, fhInput } from "../ui";

export const FLOOR_NOT_LISTED = "__other__";
const OTHER_ISSUE = "__other__";

export type WizardPreset = { service?: FacService; areaId?: string; locationId?: string; source?: "qr" | "map" };

export type LocationValue = { buildingId: string | null; floorId: string; wingId: string; areaId: string; locationId: string; exact: string };

type Form = LocationValue & { service: FacService | null; issueId: string; issueOther: string; description: string; safetyAck: boolean };

/** Resolve the location selection against the configuration (shared with the admin preview). */
export function resolveLocation(config: WizardConfig, v: LocationValue) {
  const building = config.buildings.find((b) => b.id === v.buildingId) ?? config.buildings[0] ?? null;
  const floor = building?.floors.find((f) => f.id === v.floorId) ?? null;
  const floorNotListed = v.floorId === FLOOR_NOT_LISTED;
  const needsWing = !!floor && floor.wings.length > 0;
  const wing = floor?.wings.find((w) => w.id === v.wingId) ?? null;
  const areas = floor && (!needsWing || v.wingId) ? areasForWing(floor.areas, needsWing ? v.wingId : null) : [];
  const area = areas.find((a) => a.id === v.areaId) ?? null;
  const rooms = floor && area ? floor.locations.filter((l) => PICKABLE_KINDS.has(l.kind) && l.areaId === area.id && (!wing || !l.wingId || l.wingId === wing.id)) : [];
  const room = rooms.find((l) => l.id === v.locationId) ?? null;
  const needsExact = floorNotListed || !!area?.isOther;
  return { building, floor, floorNotListed, needsWing, wing, areas, area, rooms, room, needsExact };
}

const roomName = (l: { code: string; nameEn: string; nameAr: string }, locale: string) => [pickName(l, locale), l.code].filter(Boolean).join(" ");

/** Floor → (wing) → area → (room) → exact spot, as plain dropdowns. */
export function LocationFields({ config, value, onChange, errors }: { config: WizardConfig; value: LocationValue; onChange: (p: Partial<LocationValue>) => void; errors: Record<string, string> }) {
  const t = useTranslations("Fac");
  const locale = useLocale();
  const r = resolveLocation(config, value);
  const trail = locationTrail([
    r.floorNotListed ? t("Simple.floorNotListed") : r.floor ? (r.floor.level < 0 ? r.floor.code : pickName(r.floor, locale)) : null,
    r.wing ? pickName(r.wing, locale) : null,
    r.area ? pickName(r.area, locale) : null,
    r.room ? roomName(r.room, locale) : null,
  ]);
  const sel = (id: string, label: string, val: string, onSel: (v: string) => void, opts: React.ReactNode, err?: string) => (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{label}</label>
      <select id={id} value={val} onChange={(e) => onSel(e.target.value)} className={cn(fhInput, "appearance-auto")} aria-invalid={!!err} aria-describedby={`${id}-err`}>
        <option value="">{t("Simple.choose")}</option>
        {opts}
      </select>
      <FieldError id={`${id}-err`} message={err} />
    </div>
  );
  const scope = r.area ? (locale === "ar" ? r.area.scopeNoteAr : r.area.scopeNoteEn) : "";

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {sel(
          "fh-floor",
          t("Simple.floor"),
          value.floorId,
          (v) => onChange({ floorId: v, wingId: "", areaId: "", locationId: "" }),
          <>
            {r.building?.floors.map((f) => <option key={f.id} value={f.id}>{pickName(f, locale)}</option>)}
            <option value={FLOOR_NOT_LISTED}>{t("Simple.floorNotListed")}</option>
          </>,
          errors.floorId,
        )}
        {r.needsWing &&
          sel(
            "fh-wing",
            t("Simple.wing"),
            value.wingId,
            (v) => {
              const keep = r.floor && areasForWing(r.floor.areas, v).some((a) => a.id === value.areaId);
              onChange({ wingId: v, ...(keep ? {} : { areaId: "", locationId: "" }) });
            },
            <>
              {r.floor!.wings.map((w) => <option key={w.id} value={w.id}>{pickName(w, locale)}</option>)}
              <option value={WING_UNSURE}>{t("Wizard.wingUnsure")}</option>
            </>,
            errors.wingId,
          )}
        {r.floor && (!r.needsWing || value.wingId) &&
          sel(
            "fh-area",
            t("Simple.area"),
            value.areaId,
            (v) => onChange({ areaId: v, locationId: "" }),
            r.areas.map((a) => <option key={a.id} value={a.id}>{pickName(a, locale)}</option>),
            errors.areaId,
          )}
        {r.rooms.length > 0 && (
          <div>
            <label htmlFor="fh-room" className="mb-1.5 block text-sm font-semibold">{t("Simple.room")}</label>
            <select id="fh-room" value={value.locationId} onChange={(e) => onChange({ locationId: e.target.value })} className={cn(fhInput, "appearance-auto")}>
              <option value="">{t("Simple.choose")}</option>
              {r.rooms.map((l) => <option key={l.id} value={l.id}>{roomName(l, locale)}</option>)}
            </select>
          </div>
        )}
      </div>
      {r.floor?.provisional && <p className="text-sm text-fmuted">{t("Simple.provisional")}</p>}
      {(r.area || r.floorNotListed) && (
        <div>
          <label htmlFor="fh-exact" className="mb-1.5 block text-sm font-semibold">{r.needsExact ? t("Simple.exactRequired") : t("Simple.exact")}</label>
          <input id="fh-exact" value={value.exact} onChange={(e) => onChange({ exact: e.target.value })} placeholder={t("Simple.exactPh")} className={fhInput} maxLength={300} aria-invalid={!!errors.exact} aria-describedby="fh-exact-err" />
          <FieldError id="fh-exact-err" message={errors.exact} />
        </div>
      )}
      {scope && <p className="rounded-2xl bg-[#FFF8E0] px-4 py-3 text-sm text-[#5C4400]">{scope}</p>}
      {trail && <p className="text-sm font-semibold text-deep" dir="auto">{trail}</p>}
    </div>
  );
}

export function validateLocation(config: WizardConfig, v: LocationValue, t: (k: string) => string): Record<string, string> {
  const r = resolveLocation(config, v);
  const e: Record<string, string> = {};
  if (!v.floorId) e.floorId = t("Wizard.chooseFloor");
  else if (!r.floorNotListed) {
    if (r.needsWing && !v.wingId) e.wingId = t("Wizard.chooseWing");
    else if (!r.area) e.areaId = t("Wizard.chooseArea");
  }
  if (r.needsExact && v.exact.trim().length < 5) e.exact = t("Wizard.locationDescriptionRequired");
  return e;
}

type Photo = { file: File; url: string };

/** One simple page: type → where → problem → describe → photos → send. */
export function SimpleRequestForm({ config, userId, preset, emergencyContact }: { config: WizardConfig; userId: string; preset: WizardPreset; emergencyContact: string }) {
  const t = useTranslations("Fac");
  const locale = useLocale();
  const reduce = useReducedMotion();
  const key = `fh-simple:${userId}`;
  const empty = useMemo<Form>(
    () => ({ service: preset.service ?? null, buildingId: config.buildings[0]?.id ?? null, floorId: "", wingId: "", areaId: "", locationId: "", exact: "", issueId: "", issueOther: "", description: "", safetyAck: false }),
    [config.buildings, preset.service],
  );
  const [f, setF] = useState<Form>(empty);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ready = useRef(false);

  // restore the draft (survives reloads and language switching); a QR / map link sets the location
  useEffect(() => {
    let draft: Form | null = null;
    try {
      draft = JSON.parse(localStorage.getItem(key) ?? "null");
    } catch {
      /* storage blocked */
    }
    const floors = config.buildings.flatMap((b) => b.floors.map((fl) => ({ b, fl })));
    const loc = preset.locationId ? floors.map(({ b, fl }) => ({ b, fl, l: fl.locations.find((x) => x.id === preset.locationId) })).find((x) => x.l) : null;
    const areaId = loc?.l?.areaId ?? preset.areaId;
    const hit = areaId ? floors.map(({ b, fl }) => ({ b, fl, a: fl.areas.find((a) => a.id === areaId) })).find((x) => x.a) : null;
    if (hit) {
      const wingId = loc?.l?.wingId ?? hit.a!.wingId ?? (hit.fl.wings.length ? WING_UNSURE : "");
      setF((x) => ({ ...(draft ?? x), service: preset.service ?? draft?.service ?? x.service, buildingId: hit.b.id, floorId: hit.fl.id, wingId, areaId: hit.a!.id, locationId: loc?.l?.id ?? "" }));
    } else if (draft) setF({ ...empty, ...draft, service: preset.service ?? draft.service });
    ready.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!ready.current || done) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(f));
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [f, key, done]);
  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  const r = resolveLocation(config, f);
  const issues = useMemo(
    () =>
      config.categories
        .filter((c) => c.service === f.service)
        .map((c) => ({ ...c, issues: c.issues.filter((i) => issueAppliesTo(i, r.floorNotListed ? null : r.area, r.floor?.code ?? null)) }))
        .filter((c) => c.issues.length),
    [config.categories, f.service, r.area, r.floor, r.floorNotListed],
  );
  const issue = issues.flatMap((c) => c.issues).find((i) => i.id === f.issueId) ?? null;
  const risks = detectSafetyRisks(`${f.description} ${f.issueOther}`);
  const safety = !!issue?.safetyRisk || risks.length > 0;

  const patch = (p: Partial<Form>) => {
    setF((x) => {
      const n = { ...x, ...p };
      // keep the problem only if it still applies
      const rr = resolveLocation(config, n);
      const still = config.categories.filter((c) => c.service === n.service).flatMap((c) => c.issues).find((i) => i.id === n.issueId);
      if (n.issueId && n.issueId !== OTHER_ISSUE && (!still || !issueAppliesTo(still, rr.floorNotListed ? null : rr.area, rr.floor?.code ?? null))) n.issueId = "";
      return n;
    });
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !(k in p))));
  };

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    let err = "";
    const next: Photo[] = [];
    for (const file of Array.from(list)) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) err = t("Common.uploadBadType");
      else if (file.size > MAX_PHOTO_MB * 1024 * 1024) err = t("Common.uploadTooLarge", { size: MAX_PHOTO_MB });
      else next.push({ file, url: URL.createObjectURL(file) });
    }
    setPhotos((p) => [...p, ...next].slice(0, MAX_PHOTOS));
    setErrors((e) => ({ ...e, photos: err }));
  };

  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.service) e.service = t("Wizard.chooseService");
    Object.assign(e, validateLocation(config, f, (k) => t(k as "Wizard.chooseFloor")));
    if (!f.issueId || (f.issueId === OTHER_ISSUE && f.issueOther.trim().length < 3)) e.issueId = t("Wizard.chooseIssue");
    if (f.description.trim().length < 10) e.description = t("Wizard.descriptionShort");
    if (safety && !f.safetyAck) e.safety = t("Safety.title");
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true], [data-invalid=true]")?.focus());
      return;
    }
    setServerError(null);
    start(async () => {
      const fd = new FormData();
      const priority: FacPriority = issue?.defaultPriority ?? "MEDIUM";
      fd.set(
        "payload",
        JSON.stringify({
          service: f.service,
          floorId: r.floor?.id ?? null,
          wingId: r.wing?.id ?? null,
          areaId: r.area?.id ?? null,
          locationId: r.room?.id ?? null,
          otherLocation: f.exact,
          detail: {},
          issueId: f.issueId === OTHER_ISSUE ? null : f.issueId,
          issueOther: f.issueId === OTHER_ISSUE ? f.issueOther : "",
          description: f.description,
          priority,
          phone: "",
          department: "",
          safetyAcknowledged: f.safetyAck,
        }),
      );
      photos.forEach((p) => fd.append("photos", p.file));
      const res = await submitRequestAction(fd);
      if (res.ok && res.data) {
        try {
          localStorage.removeItem(key);
        } catch {
          /* ignore */
        }
        setDone(res.data.reference);
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      } else if (!res.ok) {
        setServerError(
          res.error === "uploadTooLarge" ? t("Common.uploadTooLarge", { size: MAX_PHOTO_MB })
          : res.error === "uploadBadType" ? t("Common.uploadBadType")
          : res.error === "tooMany" ? t("Common.tooMany")
          : res.error === "invalid" ? t("Common.invalid")
          : t("Common.error"),
        );
      }
    });
  };

  if (done) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl rounded-[32px] border border-fline bg-white p-8 text-center shadow-lift sm:p-12">
        <motion.div initial={{ scale: reduce ? 1 : 0.4 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="mx-auto grid size-20 place-items-center rounded-full bg-fgreen/20 text-[#1B6B3E]">
          <CheckCircle2 className="size-10" aria-hidden="true" />
        </motion.div>
        <h2 className="mt-6 text-3xl font-extrabold text-fink">{t("Wizard.successTitle")}</h2>
        <p className="mt-3 text-fmuted">{t("Wizard.successText")}</p>
        <div className="mt-7 rounded-3xl bg-lav-50 px-6 py-5">
          <p className="text-sm font-semibold text-fmuted">{t("Wizard.reference")}</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-deep" dir="ltr">{done}</p>
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={`/facility/requests/${done}`} className={fhBtn.primary}>{t("Wizard.viewRequest")}</Link>
          <button type="button" className={fhBtn.secondary} onClick={() => { setDone(null); setF(empty); setPhotos([]); }}>{t("Wizard.newRequest")}</button>
        </div>
      </motion.div>
    );
  }

  const section = "rounded-[24px] border border-fline bg-white p-5 sm:p-6";
  const heading = (n: number, text: string) => (
    <h2 className="mb-4 flex items-center gap-3 text-lg font-extrabold text-fink">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-deep text-sm text-white">{n}</span>
      {text}
    </h2>
  );

  return (
    <form
      className="mx-auto max-w-3xl space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {preset.source && r.area && (
        <p className="rounded-2xl bg-[#E9FBF8] px-4 py-3 text-sm font-medium text-[#0D6B63]">{preset.source === "qr" ? t("Wizard.fromQr") : t("Wizard.fromMap")}</p>
      )}

      {/* 1. type */}
      <section className={section}>
        {heading(1, t("Simple.typeTitle"))}
        <div role="radiogroup" aria-label={t("Simple.typeTitle")} className="grid grid-cols-2 gap-3" data-invalid={!!errors.service} tabIndex={errors.service ? -1 : undefined}>
          {(["MAINTENANCE", "CLEANING"] as FacService[]).map((s) => {
            const on = f.service === s;
            const Icon = s === "MAINTENANCE" ? Wrench : Sparkles;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => patch({ service: s, issueId: "" })}
                className={cn("flex min-h-20 items-center justify-center gap-3 rounded-[20px] border-2 px-4 text-lg font-bold transition", on ? "border-deep bg-deep text-white" : "border-fline bg-white text-fink hover:border-lav-200")}
              >
                <Icon className="size-6" aria-hidden="true" /> {t(`Service.${s}`)}
              </button>
            );
          })}
        </div>
        <FieldError id="err-service" message={errors.service} />
      </section>

      {/* 2. where */}
      <section className={section}>
        {heading(2, t("Simple.whereTitle"))}
        <LocationFields config={config} value={f} onChange={patch} errors={errors} />
      </section>

      {/* 3. problem + description */}
      <section className={section}>
        {heading(3, t("Simple.problemTitle"))}
        <div className="space-y-4">
          <div>
            <label htmlFor="fh-issue" className="mb-1.5 block text-sm font-semibold">{t("Simple.problem")}</label>
            <select id="fh-issue" value={f.issueId} onChange={(e) => patch({ issueId: e.target.value })} className={cn(fhInput, "appearance-auto")} aria-invalid={!!errors.issueId} aria-describedby="fh-issue-err" disabled={!f.service}>
              <option value="">{t("Simple.choose")}</option>
              {issues.map((c) => (
                <optgroup key={c.id} label={pickName(c, locale)}>
                  {c.issues.map((i) => <option key={i.id} value={i.id}>{pickName(i, locale)}</option>)}
                </optgroup>
              ))}
              <option value={OTHER_ISSUE}>{t("Simple.somethingElse")}</option>
            </select>
            <FieldError id="fh-issue-err" message={errors.issueId} />
          </div>
          {f.issueId === OTHER_ISSUE && (
            <input value={f.issueOther} onChange={(e) => patch({ issueOther: e.target.value })} placeholder={t("Simple.otherProblem")} aria-label={t("Simple.otherProblem")} className={fhInput} maxLength={200} />
          )}
          <div>
            <label htmlFor="fh-desc" className="mb-1.5 block text-sm font-semibold">{t("Simple.describeTitle")}</label>
            <textarea id="fh-desc" rows={4} value={f.description} onChange={(e) => patch({ description: e.target.value })} placeholder={t("Wizard.descriptionPh")} className={fhInput} maxLength={4000} aria-invalid={!!errors.description} aria-describedby="fh-desc-err" />
            <FieldError id="fh-desc-err" message={errors.description} />
          </div>
          <AnimatePresence>
            {safety && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div role="alert" className="rounded-[20px] border-2 border-red-300 bg-red-50 p-4" data-invalid={!!errors.safety} tabIndex={-1}>
                  <p className="flex items-center gap-2 font-extrabold text-red-800"><AlertTriangle className="size-5" aria-hidden="true" /> {t("Safety.title")}</p>
                  <p className="mt-2 text-sm text-red-900">{t("Safety.text")}</p>
                  <p className="mt-2 text-sm text-red-900"><strong>{t("Safety.contact")}: </strong>{emergencyContact || t("Safety.noContact")}</p>
                  <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm font-semibold text-red-900">
                    <input type="checkbox" checked={f.safetyAck} onChange={(e) => patch({ safetyAck: e.target.checked })} className="mt-0.5 size-5 accent-red-700" />
                    {t("Safety.acknowledge")}
                  </label>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* 4. photos */}
      <section className={section}>
        {heading(4, t("Simple.photosTitle"))}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            addFiles(e.dataTransfer.files);
          }}
          className="rounded-[22px] border-2 border-dashed border-lav-200 bg-lav-50/60 p-6 text-center"
        >
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-deep shadow-soft"><ImagePlus className="size-7" aria-hidden="true" /></div>
          <p className="mx-auto mt-3 max-w-md text-sm text-fmuted">{t("Simple.photosHint", { max: MAX_PHOTOS, size: MAX_PHOTO_MB })}</p>
          <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
            <label className={cn(fhBtn.primary, "cursor-pointer", photos.length >= MAX_PHOTOS && "pointer-events-none opacity-50")}>
              <Camera className="size-4" aria-hidden="true" /> {t("Wizard.takePhoto")}
              <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
            <label className={cn(fhBtn.secondary, "cursor-pointer", photos.length >= MAX_PHOTOS && "pointer-events-none opacity-50")}>
              <ImagePlus className="size-4" aria-hidden="true" /> {t("Wizard.choosePhotos")}
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
          {photos.length > 0 && (
            <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {photos.map((p, i) => (
                <li key={p.url} className="relative aspect-square overflow-hidden rounded-2xl bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="size-full object-cover" />
                  <button type="button" onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))} className="absolute end-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-white/90 text-fink shadow" aria-label={t("Wizard.removePhoto")}>
                    <X className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <FieldError id="err-photos" message={errors.photos} />
      </section>

      {(serverError || Object.keys(errors).some((k) => errors[k])) && (
        <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{serverError ?? t("Simple.fixErrors")}</p>
      )}
      <div className="flex flex-col-reverse items-center gap-3 pt-2 sm:flex-row sm:justify-between">
        <button type="button" className={fhBtn.ghost} onClick={() => { setF(empty); setPhotos([]); setErrors({}); try { localStorage.removeItem(key); } catch { /* ignore */ } }}>
          {t("Simple.clear")}
        </button>
        <button type="submit" disabled={pending} className={cn(fhBtn.accent, "min-h-13 w-full px-8 text-base sm:w-auto")}>
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <Send className="size-5 rtl:-scale-x-100" aria-hidden="true" />}
          {pending ? t("Simple.sending") : t("Simple.send")}
        </button>
      </div>
    </form>
  );
}
