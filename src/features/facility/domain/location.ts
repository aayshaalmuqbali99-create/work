/** Extra location fields an area can ask for. Order = display order. */
export const LOCATION_FIELDS = ["office", "room", "meetingRoom", "parkingSpace", "column", "elevator", "entrance", "landmark"] as const;
export type LocationField = (typeof LOCATION_FIELDS)[number];

/** Specific location records (FacLocation.kind). The first four can be picked as "the" location; the others suggest field values. */
export const LOCATION_KINDS = ["ROOM", "OFFICE", "MEETING_ROOM", "PARKING_SECTION", "ELEVATOR", "ENTRANCE", "LANDMARK", "COLUMN"] as const;
export type LocationKind = (typeof LOCATION_KINDS)[number];
export const PICKABLE_KINDS: ReadonlySet<string> = new Set(["ROOM", "OFFICE", "MEETING_ROOM", "PARKING_SECTION"]);
/** Which detail field a floor-wide location kind suggests values for. */
export const SUGGESTS_FIELD: Partial<Record<string, LocationField>> = { ELEVATOR: "elevator", ENTRANCE: "entrance", LANDMARK: "landmark", COLUMN: "column" };

/** Area kinds the UI knows icons for. Administrators can add more in the area category library. */
export const AREA_KINDS = [
  "OFFICE", "MEETING_ROOMS", "RESTROOMS", "PANTRY", "CORRIDOR", "ELEVATOR_LOBBY", "STAIRCASE", "ENTRANCE", "RECEPTION", "WAITING_AREA",
  "PARKING", "PARKING_GATE", "EVENT_AREA", "CLINIC", "PHARMACY", "COMMON_AREA", "UTILITY_ROOM", "OTHER",
] as const;

/** Sentinel for "I'm not sure which wing". */
export const WING_UNSURE = "__unsure__";

type IssueLike = { areaKinds: string[]; floorCodes: string[]; active: boolean };

/** Issues offered for an area: matching kind (or all when the area is "Other") and floor. */
export function issueAppliesTo(issue: IssueLike, area: { kind: string; isOther: boolean } | null, floorCode: string | null): boolean {
  if (!issue.active) return false;
  if (floorCode && issue.floorCodes.length > 0 && !issue.floorCodes.includes(floorCode)) return false;
  if (!area || area.isOther) return true;
  return issue.areaKinds.length === 0 || issue.areaKinds.includes(area.kind);
}

/**
 * Areas shown for a floor + wing selection. Areas without a wing are shared by every wing.
 * With no wing chosen (floor without wings, or "not sure"), every area of the floor is shown.
 */
export function areasForWing<T extends { wingId: string | null }>(areas: T[], wingId: string | null): T[] {
  if (!wingId || wingId === WING_UNSURE) return areas;
  return areas.filter((a) => a.wingId === null || a.wingId === wingId);
}

/** True when the chosen area/location/wing combination is consistent with the floor configuration. */
export function selectionIsValid(
  floor: { wings: { id: string }[]; areas: { id: string; wingId: string | null }[]; locations: { id: string; areaId: string | null; wingId: string | null }[] },
  sel: { wingId: string | null; areaId: string | null; locationId: string | null },
): boolean {
  const hasWings = floor.wings.length > 0;
  if (sel.wingId && sel.wingId !== WING_UNSURE && !floor.wings.some((w) => w.id === sel.wingId)) return false;
  if (!hasWings && sel.wingId && sel.wingId !== WING_UNSURE) return false;
  if (sel.areaId) {
    const allowed = areasForWing(floor.areas, hasWings ? sel.wingId : null);
    if (!allowed.some((a) => a.id === sel.areaId)) return false;
  }
  if (sel.locationId) {
    const loc = floor.locations.find((l) => l.id === sel.locationId);
    if (!loc || (sel.areaId && loc.areaId && loc.areaId !== sel.areaId)) return false;
  }
  return true;
}

/** Human-readable location, e.g. "Omantel Building · B1 · Parking Area · Space 112". */
export function locationLabel(parts: (string | null | undefined)[]): string {
  return parts.map((p) => (p ?? "").trim()).filter(Boolean).join(" · ");
}

/** "B1 → Meeting Rooms → Room 12" style summary from already-translated parts. */
export function locationTrail(parts: (string | null | undefined)[]): string {
  return parts.map((p) => (p ?? "").trim()).filter(Boolean).join(" → ");
}
