import type { FacRole } from "@prisma/client";

/** Server-side permission matrix. Every page and server action checks one of these. */
export const PERMISSIONS = {
  "request.create": ["EMPLOYEE", "AGENT", "ADMIN"],
  "ops.view": ["AGENT", "ADMIN", "CONTRACTOR"],
  "ops.manageAll": ["AGENT", "ADMIN"],
  "ops.assign": ["AGENT", "ADMIN"],
  "ops.internalNotes": ["AGENT", "ADMIN", "CONTRACTOR"],
  "ops.analytics": ["AGENT", "ADMIN"],
  "config.manage": ["ADMIN"],
  "users.manage": ["ADMIN"],
} as const satisfies Record<string, readonly FacRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: FacRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly FacRole[]).includes(role);
}
