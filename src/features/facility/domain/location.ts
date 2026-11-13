/** Extra location fields an area can ask for. Order = display order. */
export const LOCATION_FIELDS = ["room", "meetingRoom", "parkingSpace", "column", "elevator", "landmark"] as const;
export type LocationField = (typeof LOCATION_FIELDS)[number];

/** Area kinds known to the UI (icons / colours). Administrators may add others — they fall back to a generic icon. */
export const AREA_KINDS = [
  "PARKING", "MEETING_ROOMS", "RESTROOMS", "PHARMACY", "CLINIC", "EVENT_AREA", "OFFICE", "PANTRY", "CORRIDOR", "ELEVATOR_LOBBY", "OTHER",
] as const;

type IssueLike = { areaKinds: string[]; floorCodes: string[]; active: boolean };

/** Issues offered for an area: matching kind (or all when the area is "Other") and floor. */
export function issueAppliesTo(issue: IssueLike, area: { kind: string; isOther: boolean } | null, floorCode: string | null): boolean {
  if (!issue.active) return false;
  if (floorCode && issue.floorCodes.length > 0 && !issue.floorCodes.includes(floorCode)) return false;
  if (!area || area.isOther) return true;
  return issue.areaKinds.length === 0 || issue.areaKinds.includes(area.kind);
}

/** Human-readable location, e.g. "Omantel Building · B1 · Parking Area · Space 112". */
export function locationLabel(parts: (string | null | undefined)[]): string {
  return parts.map((p) => (p ?? "").trim()).filter(Boolean).join(" · ");
}
