/** FAC-YYYY-000001. The sequence itself is allocated atomically on the server (see features/facility/requests). */
export function formatReference(year: number, seq: number): string {
  return `FAC-${year}-${String(seq).padStart(6, "0")}`;
}

export const REFERENCE_RE = /^FAC-\d{4}-\d{6,}$/;
