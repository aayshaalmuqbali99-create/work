import { test } from "node:test";
import assert from "node:assert/strict";
import { addBusinessMinutes, computeDeadline, type BusinessCalendar } from "../src/features/facility/domain/sla";
import { detectSafetyRisks } from "../src/features/facility/domain/safety";
import { formatReference, REFERENCE_RE } from "../src/features/facility/domain/reference";
import { canTransition, employeeCanReopen, employeeCanCancel, progressOf, TRANSITIONS, STATUSES } from "../src/features/facility/domain/status";
import { can } from "../src/features/facility/domain/permissions";
import { issueAppliesTo } from "../src/features/facility/domain/location";
import { renderTemplate } from "../src/features/facility/domain/template";
import { validateSvg } from "../src/features/facility/domain/svg";

const cal: BusinessCalendar = { timezone: "Asia/Muscat", workStart: "07:30", workEnd: "15:30", workDays: [0, 1, 2, 3, 4], holidays: [] };
// Muscat is UTC+4: 07:30 local = 03:30Z
const at = (iso: string) => new Date(iso);

test("reference numbers have the FAC-YYYY-000001 format", () => {
  assert.equal(formatReference(2026, 1), "FAC-2026-000001");
  assert.equal(formatReference(2026, 123456), "FAC-2026-123456");
  assert.ok(REFERENCE_RE.test(formatReference(2027, 42)));
  assert.ok(!REFERENCE_RE.test("FAC-26-1"));
});

test("business-hours SLA: within the same working day", () => {
  // Sunday 2026-11-15 09:00 Muscat = 05:00Z, +60 min → 10:00 Muscat
  assert.equal(addBusinessMinutes(at("2026-11-15T05:00:00Z"), 60, cal).toISOString(), "2026-11-15T06:00:00.000Z");
});

test("business-hours SLA: rolls over the weekend (Fri/Sat)", () => {
  // Thursday 2026-11-19 15:00 Muscat (11:00Z) + 60 min → 30 min Thursday + 30 min Sunday from 07:30 → Sunday 08:00 Muscat (04:00Z)
  assert.equal(addBusinessMinutes(at("2026-11-19T11:00:00Z"), 60, cal).toISOString(), "2026-11-22T04:00:00.000Z");
});

test("business-hours SLA: before opening starts at opening; holidays are skipped", () => {
  // Sunday 06:00 Muscat (02:00Z) + 30 → 08:00 Muscat
  assert.equal(addBusinessMinutes(at("2026-11-15T02:00:00Z"), 30, cal).toISOString(), "2026-11-15T04:00:00.000Z");
  const withHoliday = { ...cal, holidays: ["2026-11-15"] };
  assert.equal(addBusinessMinutes(at("2026-11-15T02:00:00Z"), 30, withHoliday).toISOString(), "2026-11-16T04:00:00.000Z");
});

test("24/7 deadlines and missing targets", () => {
  assert.equal(computeDeadline(at("2026-11-20T10:00:00Z"), 240, false, cal)!.toISOString(), "2026-11-20T14:00:00.000Z");
  assert.equal(computeDeadline(at("2026-11-20T10:00:00Z"), null, true, cal), null);
});

test("safety detection (English and Arabic)", () => {
  assert.deepEqual(detectSafetyRisks("There is smoke coming from the ceiling"), ["smoke"]);
  assert.ok(detectSafetyRisks("exposed wiring near the socket").includes("wiring"));
  assert.ok(detectSafetyRisks("water leaking onto the electrical panel").includes("waterElectric"));
  assert.ok(detectSafetyRisks("the emergency exit is blocked by boxes").includes("exit"));
  assert.ok(detectSafetyRisks("someone is stuck in the elevator").includes("entrapment"));
  assert.ok(detectSafetyRisks("يوجد دخان في الممر").includes("smoke"));
  assert.ok(detectSafetyRisks("شخص عالق في المصعد").includes("entrapment"));
  assert.deepEqual(detectSafetyRisks("Soap dispenser is empty"), []);
});

test("status transitions per role", () => {
  assert.ok(canTransition("AGENT", "SUBMITTED", "ASSIGNED"));
  assert.ok(canTransition("CONTRACTOR", "ASSIGNED", "IN_PROGRESS"));
  assert.ok(!canTransition("CONTRACTOR", "SUBMITTED", "REJECTED"));
  assert.ok(!canTransition("EMPLOYEE", "SUBMITTED", "RESOLVED"));
  assert.ok(!canTransition("ADMIN", "CANCELLED", "IN_PROGRESS"));
  for (const s of STATUSES) for (const to of TRANSITIONS[s]) assert.ok(STATUSES.includes(to));
  assert.ok(employeeCanCancel("SUBMITTED") && !employeeCanCancel("IN_PROGRESS"));
  const resolved = new Date("2026-11-01T00:00:00Z");
  assert.ok(employeeCanReopen("RESOLVED", resolved, 7, new Date("2026-11-05T00:00:00Z")));
  assert.ok(!employeeCanReopen("CLOSED", resolved, 7, new Date("2026-11-20T00:00:00Z")));
  assert.equal(progressOf("CLOSED"), 1);
});

test("permission matrix", () => {
  assert.ok(can("ADMIN", "config.manage"));
  assert.ok(!can("AGENT", "config.manage"));
  assert.ok(can("CONTRACTOR", "ops.view") && !can("CONTRACTOR", "ops.assign"));
  assert.ok(!can("EMPLOYEE", "ops.view"));
  assert.ok(!can("CONTRACTOR", "request.create"));
});

test("problems adapt to the selected area and floor", () => {
  const lighting = { areaKinds: ["PARKING", "RESTROOMS"], floorCodes: [], active: true };
  const drainage = { areaKinds: ["PARKING"], floorCodes: ["B2", "B3"], active: true };
  assert.ok(issueAppliesTo(lighting, { kind: "PARKING", isOther: false }, "B1"));
  assert.ok(!issueAppliesTo(lighting, { kind: "CLINIC", isOther: false }, "B1"));
  assert.ok(!issueAppliesTo(drainage, { kind: "PARKING", isOther: false }, "B1"));
  assert.ok(issueAppliesTo(drainage, { kind: "PARKING", isOther: false }, "B3"));
  assert.ok(issueAppliesTo(lighting, { kind: "OTHER", isOther: true }, "B1"), "Other shows every problem");
  assert.ok(!issueAppliesTo({ ...lighting, active: false }, null, null));
});

test("templates escape HTML", () => {
  assert.equal(renderTemplate("Hi {{name}} – {{reference}}", { name: "<b>A</b>", reference: "FAC-2026-000001" }, true), "Hi &lt;b&gt;A&lt;/b&gt; – FAC-2026-000001");
  assert.equal(renderTemplate("{{ missing }}!", {}), "!");
});

test("floor-plan SVG validation rejects active content", () => {
  assert.deepEqual(validateSvg('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="10" height="10"/></svg>'), { width: 2000, height: 1000 });
  assert.ok(validateSvg('<svg viewBox="0 0 2400 1200"></svg>'));
  assert.equal(validateSvg('<svg width="10" height="10"><script>alert(1)</script></svg>'), null);
  assert.equal(validateSvg('<svg width="10" height="10" onload="x()"></svg>'), null);
  assert.equal(validateSvg('<svg width="10" height="10"><image href="https://evil.example/x.png"/></svg>'), null);
  assert.equal(validateSvg("<html><body>no</body></html>"), null);
});
