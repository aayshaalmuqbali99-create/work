"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle, ArrowLeft, ArrowRight, Camera, Check, CheckCircle2, ImagePlus, Info, Loader2, MapPin, Pencil, RotateCcw, Sparkles, Wrench, X,
} from "lucide-react";
import type { FacPriority, FacService } from "@prisma/client";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { WizardConfig } from "@/features/facility/server/queries";
import { submitRequestAction } from "@/features/facility/actions/requests";
import { detectSafetyRisks } from "@/features/facility/domain/safety";
import { issueAppliesTo, LOCATION_FIELDS } from "@/features/facility/domain/location";
import { MAX_PHOTOS, MAX_PHOTO_MB } from "@/features/facility/constants";
import { pickName } from "@/features/facility/format";
import { AreaIcon, CategoryIcon } from "../icons";
import { MaintenanceIllustration, CleaningIllustration } from "../illustrations";
import { FieldError, FieldLabel, fhBtn, fhInput } from "../ui";

const STEPS = ["service", "location", "problem", "describe", "photos", "review"] as const;
type Step = (typeof STEPS)[number];
const OTHER = "__other__";
const PRIORITIES: FacPriority[] = ["LOW", "MEDIUM", "HIGH", "EMERGENCY"];

type Draft = {
  service: FacService | null;
  buildingId: string | null;
  floorId: string | null; // OTHER = floor not listed
  areaId: string | null;
  detail: Record<string, string>;
  otherLocation: string;
  issueId: string | null; // OTHER = something else
  issueOther: string;
  description: string;
  priority: FacPriority;
  phone: string;
  department: string;
  safetyAck: boolean;
};

export type WizardPreset = { service?: FacService; areaId?: string; floorId?: string; source?: "qr" | "map" };

type Photo = { file: File; url: string };

export function RequestWizard({
  config,
  userId,
  defaults,
  preset,
  emergencyContact,
}: {
  config: WizardConfig;
  userId: string;
  defaults: { phone: string; department: string };
  preset: WizardPreset;
  emergencyContact: string;
}) {
  const t = useTranslations("Fac");
  const locale = useLocale();
  const rtl = locale === "ar";
  const router = useRouter();
  const reduce = useReducedMotion();
  const storageKey = `fh-draft:${userId}`;

  const initial = useMemo<Draft>(() => {
    const b = config.buildings[0];
    return {
      service: preset.service ?? null,
      buildingId: b?.id ?? null,
      floorId: null,
      areaId: null,
      detail: {},
      otherLocation: "",
      issueId: null,
      issueOther: "",
      description: "",
      priority: "MEDIUM",
      phone: defaults.phone,
      department: defaults.department,
      safetyAck: false,
    };
  }, [config.buildings, defaults, preset.service]);

  const [d, setD] = useState<Draft>(initial);
  const [step, setStep] = useState<Step>("service");
  const [dir, setDir] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [submitting, startSubmit] = useTransition();
  const [result, setResult] = useState<{ reference: string } | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const hydrated = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // ---- derived configuration ----
  const building = config.buildings.find((b) => b.id === d.buildingId) ?? config.buildings[0];
  const floor = building?.floors.find((f) => f.id === d.floorId) ?? null;
  const area = floor?.areas.find((a) => a.id === d.areaId) ?? null;
  const floorNotListed = d.floorId === OTHER;
  const needsOtherText = floorNotListed || !!area?.isOther;
  const issuesByCategory = useMemo(
    () =>
      config.categories
        .filter((c) => c.service === d.service)
        .map((c) => ({ ...c, issues: c.issues.filter((i) => issueAppliesTo(i, floorNotListed ? null : area, floor?.code ?? null)) }))
        .filter((c) => c.issues.length > 0),
    [config.categories, d.service, area, floor, floorNotListed],
  );
  const issue = config.categories.flatMap((c) => c.issues.map((i) => ({ ...i, category: c }))).find((i) => i.id === d.issueId) ?? null;
  const risks = useMemo(() => detectSafetyRisks(`${d.description} ${d.issueOther}`), [d.description, d.issueOther]);
  const safety = !!issue?.safetyRisk || risks.length > 0 || d.priority === "EMERGENCY";

  // ---- draft persistence (survives language switch and reloads) ----
  useEffect(() => {
    let draft: { d: Draft; step: Step } | null = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) draft = JSON.parse(raw);
    } catch {
      /* storage blocked */
    }
    const presetArea = preset.areaId ? config.buildings.flatMap((b) => b.floors.map((f) => ({ b, f, a: f.areas.find((a) => a.id === preset.areaId) }))).find((x) => x.a) : null;
    if (draft?.d && !presetArea) {
      setD({ ...initial, ...draft.d, service: preset.service ?? draft.d.service });
      setStep(preset.service && draft.step === "service" ? "location" : draft.step ?? "service");
      setRestored(true);
    } else if (presetArea) {
      setD((x) => ({ ...x, buildingId: presetArea.b.id, floorId: presetArea.f.id, areaId: presetArea.a!.id }));
      setStep(preset.service ? "location" : "service");
    } else if (preset.service) {
      setStep("location");
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current || result) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ d, step }));
        setSavedAt(Date.now());
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [d, step, storageKey, result]);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  const set = useCallback(<K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((x) => ({ ...x, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  }, []);

  // ---- validation per step ----
  function validate(s: Step): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === "service" && !d.service) e.service = t("Wizard.chooseService");
    if (s === "location") {
      if (!d.floorId) e.floorId = t("Wizard.chooseFloor");
      else if (!floorNotListed && !d.areaId) e.areaId = t("Wizard.chooseArea");
      if (needsOtherText && d.otherLocation.trim().length < 5) e.otherLocation = t("Wizard.describeOther");
    }
    if (s === "problem" && (!d.issueId || (d.issueId === OTHER && d.issueOther.trim().length < 3))) e.issueId = t("Wizard.chooseIssue");
    if (s === "describe") {
      if (d.description.trim().length < 10) e.description = t("Wizard.descriptionShort");
      if (d.phone && !/^[+\d\s()-]{5,40}$/.test(d.phone)) e.phone = t("Wizard.phoneInvalid");
      if (safety && !d.safetyAck) e.safety = t("Safety.title");
    }
    return e;
  }

  function go(to: Step) {
    const from = STEPS.indexOf(step);
    const target = STEPS.indexOf(to);
    if (target > from) {
      for (let i = from; i < target; i++) {
        const e = validate(STEPS[i]);
        if (Object.keys(e).length) {
          setErrors(e);
          if (i !== from) changeStep(STEPS[i], -1);
          // move focus to the first invalid field
          requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true], [data-invalid=true]")?.focus());
          return;
        }
      }
    }
    changeStep(to, target >= from ? 1 : -1);
  }
  function changeStep(to: Step, direction: number) {
    setDir(direction);
    setErrors({});
    setStep(to);
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  // ---- photos ----
  function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    const next: Photo[] = [];
    let err = "";
    for (const f of Array.from(list)) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) err = t("Common.uploadBadType");
      else if (f.size > MAX_PHOTO_MB * 1024 * 1024) err = t("Common.uploadTooLarge", { size: MAX_PHOTO_MB });
      else next.push({ file: f, url: URL.createObjectURL(f) });
    }
    setPhotos((p) => [...p, ...next].slice(0, MAX_PHOTOS));
    setErrors((e) => ({ ...e, photos: err }));
  }

  function submit() {
    for (const s of STEPS.slice(0, 5)) {
      const e = validate(s);
      if (Object.keys(e).length) {
        setErrors(e);
        changeStep(s, -1);
        return;
      }
    }
    setServerError(null);
    startSubmit(async () => {
      const fd = new FormData();
      fd.set(
        "payload",
        JSON.stringify({
          service: d.service,
          floorId: floorNotListed ? null : d.floorId,
          areaId: floorNotListed ? null : d.areaId,
          otherLocation: needsOtherText ? d.otherLocation : "",
          detail: area ? Object.fromEntries(Object.entries(d.detail).filter(([k]) => area.fields.includes(k))) : {},
          issueId: d.issueId === OTHER ? null : d.issueId,
          issueOther: d.issueId === OTHER ? d.issueOther : "",
          description: d.description,
          priority: d.priority,
          phone: d.phone,
          department: d.department,
          safetyAcknowledged: d.safetyAck,
        }),
      );
      photos.forEach((p) => fd.append("photos", p.file));
      const res = await submitRequestAction(fd);
      if (res.ok && res.data) {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          /* ignore */
        }
        setResult(res.data);
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      } else if (!res.ok) {
        setServerError(
          res.error === "uploadTooLarge" ? t("Common.uploadTooLarge", { size: MAX_PHOTO_MB })
          : res.error === "uploadBadType" ? t("Common.uploadBadType")
          : res.error === "tooMany" ? t("Common.tooMany")
          : res.error === "invalid" ? t("Common.invalid")
          : res.error === "unauthenticated" ? t("Login.title")
          : t("Common.error"),
        );
      }
    });
  }

  function startOver() {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setD(initial);
    setPhotos([]);
    setRestored(false);
    changeStep("service", -1);
  }

  const Next = rtl ? ArrowLeft : ArrowRight;
  const Back = rtl ? ArrowRight : ArrowLeft;
  const idx = STEPS.indexOf(step);

  // ---------------------------------------------------------------- success
  if (result) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-xl rounded-[32px] border border-fline bg-white p-8 text-center shadow-lift sm:p-12">
        <motion.div
          initial={{ scale: reduce ? 1 : 0.4, rotate: reduce ? 0 : -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 16 }}
          className="mx-auto grid size-20 place-items-center rounded-full bg-fgreen/20 text-[#1B6B3E]"
        >
          <CheckCircle2 className="size-10" aria-hidden="true" />
        </motion.div>
        <h2 className="mt-6 text-3xl font-extrabold text-fink" tabIndex={-1}>{t("Wizard.successTitle")}</h2>
        <p className="mt-3 text-fmuted">{t("Wizard.successText")}</p>
        <div className="mt-7 rounded-3xl bg-lav-50 px-6 py-5">
          <p className="text-sm font-semibold text-fmuted">{t("Wizard.reference")}</p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-deep" dir="ltr">{result.reference}</p>
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={`/facility/requests/${result.reference}`} className={fhBtn.primary}>{t("Wizard.viewRequest")}</Link>
          <button
            type="button"
            className={fhBtn.secondary}
            onClick={() => {
              setResult(null);
              setD(initial);
              setPhotos([]);
              changeStep("service", -1);
              router.replace("/facility/request");
            }}
          >
            {t("Wizard.newRequest")}
          </button>
        </div>
      </motion.div>
    );
  }

  // ---------------------------------------------------------------- wizard
  return (
    <div className="mx-auto max-w-4xl">
      {/* progress */}
      <div className="sticky top-[88px] z-20 -mx-2 mb-8 rounded-[24px] bg-white/85 px-2 py-3 backdrop-blur fh-noprint">
        <div className="flex items-center justify-between text-sm">
          <p className="font-semibold text-deep" aria-live="polite">{t("Wizard.stepOf", { current: idx + 1, total: STEPS.length })} · {t(`Wizard.steps.${step}`)}</p>
          <p className="text-xs text-fmuted" aria-live="polite">{savedAt ? t("Wizard.draftSaved") : ""}</p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-lav-100" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={idx + 1}>
          <motion.div className="h-full rounded-full bg-[linear-gradient(90deg,#2D13EA,#5B44FF)]" animate={{ width: `${((idx + 1) / STEPS.length) * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
        </div>
        <ol className="mt-3 hidden grid-cols-6 gap-2 md:grid">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => i < idx && go(s)}
                disabled={i > idx}
                aria-current={s === step ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-semibold transition",
                  s === step ? "text-deep" : i < idx ? "text-fink hover:bg-lav-50" : "text-fmuted/60",
                )}
              >
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-[10px]", i < idx ? "bg-deep text-white" : s === step ? "bg-gold text-fink" : "bg-lav-100 text-fmuted")}>
                  {i < idx ? <Check className="size-3" /> : i + 1}
                </span>
                {t(`Wizard.steps.${s}`)}
              </button>
            </li>
          ))}
        </ol>
      </div>

      {restored && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-lav-50 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-deep"><Info className="size-4" aria-hidden="true" /> {t("Wizard.draftRestored")}</span>
          <button type="button" onClick={startOver} className="inline-flex items-center gap-1.5 font-semibold text-deep hover:underline">
            <RotateCcw className="size-4" aria-hidden="true" /> {t("Wizard.startOver")}
          </button>
        </div>
      )}

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.section
          key={step}
          custom={dir}
          initial={{ opacity: 0, x: reduce ? 0 : (rtl ? -1 : 1) * dir * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: reduce ? 0 : (rtl ? 1 : -1) * dir * 40 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          aria-labelledby="fh-step-title"
        >
          {/* ---------------- 1. service ---------------- */}
          {step === "service" && (
            <>
              <StepHeading id="fh-step-title" ref={headingRef} title={t("Wizard.serviceTitle")} help={t("Wizard.serviceHelp")} />
              <div role="radiogroup" aria-label={t("Wizard.serviceTitle")} className="grid gap-4 sm:grid-cols-2" data-invalid={!!errors.service}>
                {(["MAINTENANCE", "CLEANING"] as FacService[]).map((s) => {
                  const selected = d.service === s;
                  const Illus = s === "MAINTENANCE" ? MaintenanceIllustration : CleaningIllustration;
                  return (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setD((x) => ({ ...x, service: s, issueId: x.service === s ? x.issueId : null }));
                        setErrors({});
                      }}
                      className={cn(
                        "group relative overflow-hidden rounded-[28px] border-2 bg-white p-6 text-start transition duration-200",
                        selected ? "border-deep shadow-lift" : "border-fline hover:-translate-y-0.5 hover:border-lav-200 hover:shadow-soft",
                      )}
                    >
                      <Illus className="mx-auto h-36 w-auto transition duration-300 group-hover:scale-105" />
                      <span className="mt-2 block text-xl font-extrabold text-fink">{t(`Home.${s === "MAINTENANCE" ? "maintenance" : "cleaning"}Title`)}</span>
                      <span className="mt-1 block text-sm text-fmuted">{t(`Home.${s === "MAINTENANCE" ? "maintenance" : "cleaning"}Tags`)}</span>
                      <SelectedTick on={selected} />
                    </button>
                  );
                })}
              </div>
              <FieldError id="err-service" message={errors.service} />
            </>
          )}

          {/* ---------------- 2. location ---------------- */}
          {step === "location" && (
            <>
              <StepHeading id="fh-step-title" ref={headingRef} title={t("Wizard.locationTitle")} help={t("Wizard.locationHelp")} />
              {preset.source && d.areaId && (
                <p className="mb-5 flex items-center gap-2 rounded-2xl bg-[#E9FBF8] px-4 py-3 text-sm font-medium text-[#0D6B63]">
                  <MapPin className="size-4" aria-hidden="true" /> {preset.source === "qr" ? t("Wizard.fromQr") : t("Wizard.fromMap")}
                </p>
              )}
              {config.buildings.length > 1 && (
                <div className="mb-6">
                  <p className="mb-2 text-sm font-semibold">{t("Wizard.building")}</p>
                  <div className="flex flex-wrap gap-2">
                    {config.buildings.map((b) => (
                      <Chip key={b.id} on={b.id === d.buildingId} onClick={() => setD((x) => ({ ...x, buildingId: b.id, floorId: null, areaId: null }))}>
                        {pickName(b, locale)}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">{t("Wizard.floor")}</legend>
                <div role="radiogroup" aria-label={t("Wizard.floor")} className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-invalid={!!errors.floorId} tabIndex={errors.floorId ? -1 : undefined}>
                  {building?.floors.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      role="radio"
                      aria-checked={d.floorId === f.id}
                      onClick={() => setD((x) => ({ ...x, floorId: f.id, areaId: x.floorId === f.id ? x.areaId : null, issueId: null }))}
                      className={cn(
                        "relative rounded-[22px] border-2 bg-white px-4 py-4 text-start transition",
                        d.floorId === f.id ? "border-deep bg-lav-50 shadow-soft" : "border-fline hover:border-lav-200",
                      )}
                    >
                      <span className="block text-2xl font-extrabold text-deep" dir="ltr">{f.code}</span>
                      <span className="mt-1 block text-xs font-medium text-fmuted">
                        {pickName(f, locale)}
                        {f.wingId && ` · ${pickName(building.wings.find((w) => w.id === f.wingId), locale)}`}
                      </span>
                      <SelectedTick on={d.floorId === f.id} small />
                    </button>
                  ))}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={floorNotListed}
                    onClick={() => setD((x) => ({ ...x, floorId: OTHER, areaId: null, issueId: null }))}
                    className={cn("relative rounded-[22px] border-2 border-dashed bg-white px-4 py-4 text-start transition", floorNotListed ? "border-deep bg-lav-50" : "border-fline hover:border-lav-200")}
                  >
                    <span className="block text-2xl font-extrabold text-fmuted">?</span>
                    <span className="mt-1 block text-xs font-medium text-fmuted">{t("Wizard.notListedFloor")}</span>
                  </button>
                </div>
                <FieldError id="err-floor" message={errors.floorId} />
              </fieldset>

              {floor && (
                <fieldset className="mt-8">
                  <legend className="mb-3 text-sm font-semibold">{t("Wizard.area")}</legend>
                  {floor.areas.length === 0 ? (
                    <p className="rounded-2xl bg-lav-50 px-4 py-3 text-sm text-fmuted">{t("Wizard.noAreas")}</p>
                  ) : (
                    <div role="radiogroup" aria-label={t("Wizard.area")} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-invalid={!!errors.areaId} tabIndex={errors.areaId ? -1 : undefined}>
                      {floor.areas.map((a) => {
                        const parent = a.parentId ? floor.areas.find((p) => p.id === a.parentId) : null;
                        const on = d.areaId === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => setD((x) => ({ ...x, areaId: a.id, issueId: x.areaId === a.id ? x.issueId : null }))}
                            className={cn(
                              "relative flex items-center gap-3 rounded-[22px] border-2 bg-white p-4 text-start transition",
                              on ? "border-deep bg-lav-50 shadow-soft" : "border-fline hover:-translate-y-0.5 hover:border-lav-200",
                            )}
                          >
                            <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl transition", on ? "bg-deep text-white" : "bg-lav-50 text-deep")}>
                              <AreaIcon kind={a.kind} className="size-5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block font-bold text-fink">{pickName(a, locale)}</span>
                              {(parent || (locale === "ar" ? a.descAr : a.descEn)) && (
                                <span className="block truncate text-xs text-fmuted">{parent ? pickName(parent, locale) : locale === "ar" ? a.descAr : a.descEn}</span>
                              )}
                            </span>
                            <SelectedTick on={on} small />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <FieldError id="err-area" message={errors.areaId} />
                </fieldset>
              )}

              {area && (locale === "ar" ? area.scopeNoteAr : area.scopeNoteEn) && (
                <p className="mt-5 flex gap-2 rounded-2xl border border-[#FFE59A] bg-[#FFF8E0] px-4 py-3 text-sm text-[#5C4400]">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span><strong>{t("Wizard.scopeNote")}: </strong>{locale === "ar" ? area.scopeNoteAr : area.scopeNoteEn}</span>
                </p>
              )}

              {needsOtherText && (
                <div className="mt-6">
                  <FieldLabel htmlFor="fh-other-loc">{t("Wizard.otherLocation")}</FieldLabel>
                  <textarea
                    id="fh-other-loc"
                    rows={2}
                    value={d.otherLocation}
                    onChange={(e) => set("otherLocation", e.target.value)}
                    placeholder={t("Wizard.otherLocationPh")}
                    className={fhInput}
                    aria-invalid={!!errors.otherLocation}
                    aria-describedby="err-otherloc"
                    maxLength={300}
                  />
                  <FieldError id="err-otherloc" message={errors.otherLocation} />
                </div>
              )}

              {area && area.fields.length > 0 && (
                <div className="mt-8 rounded-[24px] border border-fline bg-lav-50/50 p-5">
                  <p className="mb-4 text-sm font-semibold">{t("Wizard.exactDetails")}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {LOCATION_FIELDS.filter((f) => area.fields.includes(f)).map((f) => (
                      <div key={f}>
                        <FieldLabel htmlFor={`fh-${f}`}>{t(`Fields.${f}`)}</FieldLabel>
                        <input
                          id={`fh-${f}`}
                          value={d.detail[f] ?? ""}
                          onChange={(e) => setD((x) => ({ ...x, detail: { ...x.detail, [f]: e.target.value } }))}
                          placeholder={t(`Fields.${f}Ph`)}
                          className={fhInput}
                          maxLength={120}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ---------------- 3. problem ---------------- */}
          {step === "problem" && (
            <>
              <StepHeading id="fh-step-title" ref={headingRef} title={t("Wizard.problemTitle")} help={t("Wizard.problemHelp")} />
              {issuesByCategory.length === 0 && <p className="mb-5 rounded-2xl bg-lav-50 px-4 py-3 text-sm text-fmuted">{t("Wizard.noIssues")}</p>}
              <div role="radiogroup" aria-label={t("Wizard.problemTitle")} className="space-y-7" data-invalid={!!errors.issueId} tabIndex={errors.issueId ? -1 : undefined}>
                {issuesByCategory.map((c) => (
                  <div key={c.id}>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-fmuted">
                      <CategoryIcon name={c.icon} className="size-4 text-deep" /> {pickName(c, locale)}
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {c.issues.map((i) => {
                        const on = d.issueId === i.id;
                        return (
                          <button
                            key={i.id}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => setD((x) => ({ ...x, issueId: i.id, priority: x.issueId === i.id ? x.priority : i.defaultPriority }))}
                            className={cn(
                              "relative flex min-h-16 items-center gap-3 rounded-[20px] border-2 bg-white px-4 py-3 text-start transition",
                              on ? "border-deep bg-lav-50 shadow-soft" : "border-fline hover:-translate-y-0.5 hover:border-lav-200",
                            )}
                          >
                            <span className="font-semibold text-fink">{pickName(i, locale)}</span>
                            {i.safetyRisk && <AlertTriangle className="size-4 shrink-0 text-gold" aria-label={t("Safety.title")} />}
                            <SelectedTick on={on} small />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <div>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={d.issueId === OTHER}
                    onClick={() => set("issueId", OTHER)}
                    className={cn("relative flex w-full items-center gap-3 rounded-[20px] border-2 border-dashed bg-white px-4 py-4 text-start transition sm:w-auto", d.issueId === OTHER ? "border-deep bg-lav-50" : "border-fline hover:border-lav-200")}
                  >
                    {d.service === "CLEANING" ? <Sparkles className="size-5 text-deep" /> : <Wrench className="size-5 text-deep" />}
                    <span className="font-semibold">{t("Wizard.otherIssue")}</span>
                  </button>
                  {d.issueId === OTHER && (
                    <input
                      autoFocus
                      value={d.issueOther}
                      onChange={(e) => set("issueOther", e.target.value)}
                      placeholder={t("Wizard.otherIssuePh")}
                      className={cn(fhInput, "mt-3 max-w-xl")}
                      maxLength={200}
                      aria-label={t("Wizard.otherIssue")}
                      aria-invalid={!!errors.issueId}
                    />
                  )}
                </div>
              </div>
              <FieldError id="err-issue" message={errors.issueId} />
            </>
          )}

          {/* ---------------- 4. describe ---------------- */}
          {step === "describe" && (
            <>
              <StepHeading id="fh-step-title" ref={headingRef} title={t("Wizard.describeTitle")} />
              <div>
                <FieldLabel htmlFor="fh-desc">{t("Wizard.description")}</FieldLabel>
                <textarea
                  id="fh-desc"
                  rows={5}
                  value={d.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder={t("Wizard.descriptionPh")}
                  className={fhInput}
                  aria-invalid={!!errors.description}
                  aria-describedby="fh-desc-hint err-desc"
                  maxLength={4000}
                />
                <div className="mt-1.5 flex justify-between gap-4 text-xs text-fmuted">
                  <p id="fh-desc-hint">{t("Wizard.descriptionHint")}</p>
                  <p dir="ltr">{d.description.length}/4000</p>
                </div>
                <FieldError id="err-desc" message={errors.description} />
              </div>

              <fieldset className="mt-8">
                <legend className="mb-3 text-sm font-semibold">{t("Wizard.urgency")}</legend>
                <div role="radiogroup" aria-label={t("Wizard.urgency")} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {PRIORITIES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={d.priority === p}
                      onClick={() => set("priority", p)}
                      className={cn(
                        "rounded-[20px] border-2 bg-white p-4 text-start transition",
                        d.priority === p ? (p === "EMERGENCY" ? "border-red-600 bg-red-50" : "border-deep bg-lav-50") : "border-fline hover:border-lav-200",
                      )}
                    >
                      <span className={cn("block font-bold", p === "EMERGENCY" ? "text-red-700" : "text-fink")}>{t(`Priority.${p}`)}</span>
                      <span className="mt-1 block text-xs text-fmuted">{t(`PriorityHelp.${p}`)}</span>
                    </button>
                  ))}
                </div>
              </fieldset>

              <AnimatePresence>
                {safety && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div role="alert" className="mt-8 rounded-[24px] border-2 border-red-300 bg-red-50 p-5 sm:p-6" data-invalid={!!errors.safety} tabIndex={-1}>
                      <p className="flex items-center gap-2 text-lg font-extrabold text-red-800"><AlertTriangle className="size-6" aria-hidden="true" /> {t("Safety.title")}</p>
                      {risks.length > 0 && <p className="mt-2 text-sm font-semibold text-red-800">{risks.map((r) => t(`Safety.kinds.${r}`)).join(" · ")}</p>}
                      <p className="mt-3 text-sm leading-relaxed text-red-900">{t("Safety.text")}</p>
                      <p className="mt-3 text-sm text-red-900"><strong>{t("Safety.contact")}: </strong>{emergencyContact || t("Safety.noContact")}</p>
                      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl bg-white/70 p-3 text-sm font-semibold text-red-900">
                        <input type="checkbox" checked={d.safetyAck} onChange={(e) => set("safetyAck", e.target.checked)} className="mt-0.5 size-5 accent-red-700" />
                        {t("Safety.acknowledge")}
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <fieldset className="mt-8 grid gap-4 sm:grid-cols-2">
                <legend className="mb-3 text-sm font-semibold">{t("Wizard.contact")}</legend>
                <div>
                  <FieldLabel htmlFor="fh-phone">{t("Wizard.phone")}</FieldLabel>
                  <input id="fh-phone" type="tel" dir="ltr" value={d.phone} onChange={(e) => set("phone", e.target.value)} placeholder={t("Wizard.phonePh")} className={fhInput} aria-invalid={!!errors.phone} aria-describedby="err-phone" autoComplete="tel" maxLength={40} />
                  <FieldError id="err-phone" message={errors.phone} />
                </div>
                <div>
                  <FieldLabel htmlFor="fh-dept">{t("Wizard.department")}</FieldLabel>
                  <input id="fh-dept" value={d.department} onChange={(e) => set("department", e.target.value)} placeholder={t("Wizard.departmentPh")} className={fhInput} maxLength={120} />
                </div>
              </fieldset>
            </>
          )}

          {/* ---------------- 5. photos ---------------- */}
          {step === "photos" && (
            <>
              <StepHeading id="fh-step-title" ref={headingRef} title={t("Wizard.photosTitle")} help={t("Wizard.photosHelp", { max: MAX_PHOTOS, size: MAX_PHOTO_MB })} />
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles(e.dataTransfer.files);
                }}
                className="rounded-[28px] border-2 border-dashed border-lav-200 bg-lav-50/60 p-8 text-center"
              >
                <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-white text-deep shadow-soft"><ImagePlus className="size-7" aria-hidden="true" /></div>
                <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                  <label className={cn(fhBtn.primary, "cursor-pointer", photos.length >= MAX_PHOTOS && "pointer-events-none opacity-50")}>
                    <Camera className="size-4" aria-hidden="true" /> {t("Wizard.takePhoto")}
                    <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                  </label>
                  <label className={cn(fhBtn.secondary, "cursor-pointer", photos.length >= MAX_PHOTOS && "pointer-events-none opacity-50")}>
                    <ImagePlus className="size-4" aria-hidden="true" /> {t("Wizard.choosePhotos")}
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                  </label>
                </div>
                <p className="mt-3 hidden text-sm text-fmuted sm:block">{t("Wizard.dropHere")}</p>
              </div>
              <FieldError id="err-photos" message={errors.photos} />
              {photos.length > 0 && (
                <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <AnimatePresence>
                    {photos.map((p, i) => (
                      <motion.li key={p.url} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative aspect-square overflow-hidden rounded-2xl bg-lav-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt="" className="size-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                          className="absolute end-2 top-2 grid size-8 place-items-center rounded-full bg-white/90 text-fink shadow hover:bg-white"
                          aria-label={t("Wizard.removePhoto")}
                        >
                          <X className="size-4" />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </>
          )}

          {/* ---------------- 6. review ---------------- */}
          {step === "review" && (
            <>
              <StepHeading id="fh-step-title" ref={headingRef} title={t("Wizard.reviewTitle")} help={t("Wizard.reviewHelp")} />
              <dl className="grid gap-3 sm:grid-cols-2">
                <ReviewItem label={t("Wizard.steps.service")} onEdit={() => go("service")} edit={t("Wizard.edit")}>
                  {d.service && t(`Service.${d.service}`)}
                </ReviewItem>
                <ReviewItem label={t("Wizard.steps.location")} onEdit={() => go("location")} edit={t("Wizard.edit")}>
                  {[
                    floorNotListed ? t("Wizard.notListedFloor") : pickName(floor, locale),
                    area && !area.isOther ? pickName(area, locale) : "",
                    ...LOCATION_FIELDS.filter((f) => area?.fields.includes(f) && d.detail[f]).map((f) => `${t(`Fields.${f}`)}: ${d.detail[f]}`),
                    needsOtherText ? d.otherLocation : "",
                  ].filter(Boolean).join(" · ")}
                </ReviewItem>
                <ReviewItem label={t("Wizard.steps.problem")} onEdit={() => go("problem")} edit={t("Wizard.edit")}>
                  {d.issueId === OTHER ? d.issueOther : issue ? `${pickName(issue.category, locale)} · ${pickName(issue, locale)}` : ""}
                </ReviewItem>
                <ReviewItem label={t("Detail.priority")} onEdit={() => go("describe")} edit={t("Wizard.edit")}>
                  {t(`Priority.${d.priority}`)}
                </ReviewItem>
                <ReviewItem label={t("Wizard.description")} onEdit={() => go("describe")} edit={t("Wizard.edit")} wide>
                  <span className="whitespace-pre-line">{d.description}</span>
                </ReviewItem>
                <ReviewItem label={t("Wizard.contact")} onEdit={() => go("describe")} edit={t("Wizard.edit")}>
                  <span dir="ltr">{d.phone || "—"}</span>{d.department && ` · ${d.department}`}
                </ReviewItem>
                <ReviewItem label={t("Wizard.steps.photos")} onEdit={() => go("photos")} edit={t("Wizard.edit")}>
                  {photos.length === 0 ? (
                    t("Wizard.noPhotos")
                  ) : (
                    <span className="mt-1 flex gap-2">
                      {photos.map((p) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={p.url} src={p.url} alt="" className="size-12 rounded-xl object-cover" />
                      ))}
                    </span>
                  )}
                </ReviewItem>
              </dl>
              {serverError && <p role="alert" className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{serverError}</p>}
            </>
          )}
        </motion.section>
      </AnimatePresence>

      {/* navigation */}
      <div className="mt-10 flex items-center justify-between gap-3 border-t border-fline pt-6">
        {idx > 0 ? (
          <button type="button" onClick={() => go(STEPS[idx - 1])} className={fhBtn.secondary}>
            <Back className="size-4" aria-hidden="true" /> {t("Wizard.back")}
          </button>
        ) : (
          <span />
        )}
        {step === "review" ? (
          <button type="button" onClick={submit} disabled={submitting} className={cn(fhBtn.accent, "min-w-44")}>
            {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
            {submitting ? t("Wizard.submitting") : t("Wizard.submit")}
          </button>
        ) : (
          <button type="button" onClick={() => go(STEPS[idx + 1])} className={cn(fhBtn.primary, "min-w-36")}>
            {t("Wizard.next")} <Next className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

const StepHeading = ({ id, title, help, ref }: { id: string; title: string; help?: string; ref: React.Ref<HTMLHeadingElement> }) => (
  <div className="mb-7">
    <h2 id={id} ref={ref} tabIndex={-1} className="text-title font-extrabold tracking-tight text-fink outline-none">{title}</h2>
    {help && <p className="mt-2 max-w-2xl text-fmuted">{help}</p>}
  </div>
);

function SelectedTick({ on, small }: { on: boolean; small?: boolean }) {
  return (
    <AnimatePresence>
      {on && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 24 }}
          className={cn("absolute end-3 top-3 grid place-items-center rounded-full bg-deep text-white", small ? "size-5" : "size-7")}
          aria-hidden="true"
        >
          <Check className={small ? "size-3" : "size-4"} />
        </motion.span>
      )}
    </AnimatePresence>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cn("rounded-full border-2 px-4 py-2 text-sm font-semibold transition", on ? "border-deep bg-lav-50 text-deep" : "border-fline hover:border-lav-200")}>
      {children}
    </button>
  );
}

function ReviewItem({ label, children, onEdit, edit, wide }: { label: string; children: React.ReactNode; onEdit: () => void; edit: string; wide?: boolean }) {
  return (
    <div className={cn("rounded-[22px] border border-fline bg-white p-4", wide && "sm:col-span-2")}>
      <div className="flex items-center justify-between gap-2">
        <dt className="text-xs font-bold uppercase tracking-wider text-fmuted">{label}</dt>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-deep hover:bg-lav-50">
          <Pencil className="size-3" aria-hidden="true" /> {edit}
        </button>
      </div>
      <dd className="mt-1.5 font-medium text-fink">{children}</dd>
    </div>
  );
}
