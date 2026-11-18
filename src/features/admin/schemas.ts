import { z } from "zod";
import { archetypes } from "@/components/viewer3d/archetypes";

/** Error messages are Admin.* translation keys. */
const text = (max: number) => z.string().trim().max(max, "tooLong");
const lines = z
  .string()
  .default("")
  .transform((s) => s.split(/\r?\n/).map((l) => l.trim()).filter(Boolean))
  .pipe(z.array(z.string().max(300, "tooLong")).max(15, "tooLong"));
const optionalText = (max: number) => text(max).transform((s) => (s === "" ? null : s));

export const deviceSchema = z.object({
  nameEn: text(200).min(1, "required"),
  nameAr: text(200),
  brand: optionalText(120),
  model: optionalText(120),
  slug: z.string().trim().max(90, "tooLong").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "invalidSlug").or(z.literal("")),
  categoryKey: z.string().default(""),
  archetype: z
    .string()
    .default("")
    .refine((v) => v === "" || v in archetypes, "required"),
  condition: z.enum(["UNVERIFIED", "NEW", "USED"]),
  quantity: z.coerce.number({ invalid_type_error: "invalidNumber" }).int("invalidNumber").min(0, "invalidNumber").max(1_000_000, "invalidNumber"),
  quantityReason: text(200).default(""),
  marketPrice: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || (/^\d+(\.\d{1,3})?$/.test(v) && Number(v) <= 10_000_000), "invalidNumber")
    .transform((v) => (v === "" ? null : v)),
  descEn: text(4000).default(""),
  descAr: text(4000).default(""),
  usesEn: lines,
  usesAr: lines,
  benefitsEn: lines,
  benefitsAr: lines,
});

export type DeviceInput = z.infer<typeof deviceSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(1).max(200),
});

export const passwordSchema = z
  .object({
    current: z.string().min(1, "required").max(200),
    next: z.string().min(12, "passwordRules").max(200),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "passwordMismatch" });

export type FormState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Changes on every successful submit so the UI can show a fresh confirmation. */
  at?: number;
  redirectTo?: string;
};

const KNOWN = new Set(["required", "tooLong", "invalidNumber", "invalidSlug", "passwordRules", "passwordMismatch", "invalidEmail"]);

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (!out[key]) out[key] = KNOWN.has(issue.message) ? issue.message : "required";
  }
  return out;
}

export const newUserSchema = z.object({
  name: z.string().trim().min(1, "required").max(120, "tooLong"),
  email: z.string().trim().toLowerCase().email("invalidEmail").max(200, "tooLong"),
  role: z.enum(["ADMIN", "EDITOR"]),
  password: z.string().min(12, "passwordRules").max(200, "tooLong"),
});
