import { z } from "zod";

/** Error messages are Auth.* translation keys. */
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
};

const KNOWN = new Set(["required", "tooLong", "passwordRules", "passwordMismatch", "invalidEmail"]);

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
  role: z.enum(["ADMIN", "VIEWER"]),
  cdpRaw: z.preprocess((v) => v === "on" || v === "true", z.boolean()).default(false),
  password: z.string().min(12, "passwordRules").max(200, "tooLong"),
});
