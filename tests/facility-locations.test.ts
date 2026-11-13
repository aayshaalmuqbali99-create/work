import { test } from "node:test";
import assert from "node:assert/strict";
import { areasForWing, issueAppliesTo, locationTrail, selectionIsValid, WING_UNSURE } from "../src/features/facility/domain/location";
import { AREA_CATEGORIES, BASEMENT_AREAS, UPPER_FLOORS } from "../prisma/seed-locations";

const floor = {
  wings: [{ id: "sun" }, { id: "moon" }],
  areas: [
    { id: "shared", wingId: null },
    { id: "sun-only", wingId: "sun" },
    { id: "moon-only", wingId: "moon" },
  ],
  locations: [
    { id: "room12", areaId: "sun-only", wingId: "sun" },
    { id: "lift", areaId: null, wingId: null },
  ],
};

test("areas follow the selected wing; shared areas appear in every wing", () => {
  assert.deepEqual(areasForWing(floor.areas, "sun").map((a) => a.id), ["shared", "sun-only"]);
  assert.deepEqual(areasForWing(floor.areas, "moon").map((a) => a.id), ["shared", "moon-only"]);
  assert.equal(areasForWing(floor.areas, WING_UNSURE).length, 3, "not sure → every area");
  assert.equal(areasForWing(floor.areas, null).length, 3, "no wing step → every area");
});

test("selection validation rejects inconsistent wing / area / location", () => {
  assert.ok(selectionIsValid(floor, { wingId: "sun", areaId: "sun-only", locationId: "room12" }));
  assert.ok(!selectionIsValid(floor, { wingId: "moon", areaId: "sun-only", locationId: null }), "area of another wing");
  assert.ok(!selectionIsValid(floor, { wingId: "other", areaId: null, locationId: null }), "wing not on this floor");
  assert.ok(!selectionIsValid(floor, { wingId: "sun", areaId: "shared", locationId: "room12" }), "location of another area");
  assert.ok(selectionIsValid(floor, { wingId: WING_UNSURE, areaId: "moon-only", locationId: null }));
  const basement = { wings: [], areas: [{ id: "p", wingId: null }], locations: [] };
  assert.ok(!selectionIsValid(basement, { wingId: "sun", areaId: "p", locationId: null }), "basement has no wings");
});

test("location trail reads like B1 → Meeting Rooms → Room 12", () => {
  assert.equal(locationTrail(["B1", null, "Meeting Rooms", "Room 12"]), "B1 → Meeting Rooms → Room 12");
  assert.equal(locationTrail(["B2", "", "Parking Area", "Column 15"]), "B2 → Parking Area → Column 15");
});

test("confirmed basement configuration is exactly as supplied", () => {
  assert.deepEqual(BASEMENT_AREAS.B1.map((a) => a.nameEn), ["Parking Area", "Meeting Rooms", "Restrooms", "Pharmacy", "Clinic", "Central Event Area", "Other"]);
  assert.deepEqual(BASEMENT_AREAS.B2.map((a) => a.nameEn), ["Parking Area", "Other"]);
  assert.deepEqual(BASEMENT_AREAS.B3.map((a) => a.nameEn), ["Parking Area", "Other"]);
  assert.equal(BASEMENT_AREAS.B1.find((a) => a.kind === "EVENT_AREA")?.nameAr, "منطقة الفعاليات في المنتصف");
});

test("provisional upper floors and the area library", () => {
  assert.deepEqual(UPPER_FLOORS.map((f) => f.code), ["G", "M", "1", "2", "3", "4", "5", "6"]);
  assert.ok(UPPER_FLOORS[0].areas.some((a) => a.kind === "RECEPTION"), "ground has reception");
  assert.ok(!UPPER_FLOORS[1].areas.some((a) => a.kind === "RECEPTION"), "mezzanine has no reception");
  const keys = AREA_CATEGORIES.map((c) => c[0]);
  for (const k of ["OFFICE", "MEETING_ROOMS", "RESTROOMS", "PANTRY", "CORRIDOR", "ELEVATOR_LOBBY", "STAIRCASE", "ENTRANCE", "RECEPTION", "WAITING_AREA", "PARKING", "PARKING_GATE", "EVENT_AREA", "CLINIC", "PHARMACY", "COMMON_AREA", "UTILITY_ROOM", "OTHER"]) {
    assert.ok(keys.includes(k), k);
  }
  const parking = AREA_CATEGORIES.find((c) => c[0] === "PARKING")!;
  assert.ok(parking[4].includes("parkingSpace") && parking[4].includes("column"), "parking asks for space and column");
});

test("problems still adapt to the area type", () => {
  const ac = { areaKinds: ["MEETING_ROOMS", "RECEPTION"], floorCodes: [], active: true };
  assert.ok(issueAppliesTo(ac, { kind: "RECEPTION", isOther: false }, "G"));
  assert.ok(!issueAppliesTo(ac, { kind: "PARKING", isOther: false }, "B2"));
});
