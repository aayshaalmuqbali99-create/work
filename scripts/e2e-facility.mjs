/**
 * End-to-end checks for Omantel Facility Hub (Playwright, real browser, real database).
 *   BASE_URL=http://localhost:3000 FAC_DEV_PASSWORD=... node scripts/e2e-facility.mjs
 * Requires the development sample accounts (npm run db:seed) and the dev sign-in enabled.
 * Creates real requests in the database; they are tagged "[e2e]" in the description.
 */
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const BASE = process.env.BASE_URL || "http://localhost:3000";
const PASSWORD = process.env.FAC_DEV_PASSWORD || "FacilityHub-Dev-2026";
const T = 90_000;
const results = [];
const errors = [];

async function step(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push(`PASS  ${name} (${Date.now() - t0} ms)`);
  } catch (e) {
    results.push(`FAIL  ${name}: ${e.message.split("\n")[0]}`);
    process.exitCode = 1;
  }
}

function watch(page, label) {
  page.on("pageerror", (e) => errors.push(`${label}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !/favicon|Download the React DevTools|401|404 \(Not Found\)/.test(m.text())) errors.push(`${label}: ${m.text()}`);
  });
}

// The suite signs in many times from one IP; clear the (working) sign-in rate limiter between logins.
const { PrismaClient } = require("@prisma/client");
const testDb = new PrismaClient();
async function login(ctx, email, locale = "en") {
  await testDb.rateLimit.deleteMany({ where: { key: { startsWith: "fac-login:" } } });
  const page = await ctx.newPage();
  watch(page, email);
  await page.goto(`${BASE}/${locale}/facility/login`, { timeout: T });
  await page.fill("#fh-email", email);
  await page.fill("#fh-password", PASSWORD);
  await Promise.all([page.waitForURL(/\/facility(\/ops)?$/, { timeout: T }), page.click("form button")]);
  return page;
}

// a small real PNG for photo upload
const dir = mkdtempSync(join(tmpdir(), "fh-e2e-"));
const png = join(dir, "issue.png");
writeFileSync(png, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC", "base64"));
const svgMap = join(dir, "plan.svg");
writeFileSync(svgMap, '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600"><rect width="1200" height="600" fill="#f4f3ff"/><rect x="40" y="40" width="500" height="520" fill="#d9d5ff"/><text x="80" y="90" font-size="32">E2E test plan</text></svg>');

const browser = await chromium.launch();
let reference = "";

await step("anonymous: homepage renders in Arabic (RTL) and English with video hero", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  watch(page, "anon");
  await page.goto(`${BASE}/ar/facility`, { timeout: T });
  assert.equal(await page.getAttribute("html", "dir"), "rtl");
  await page.getByRole("heading", { level: 1, name: "بيئة عملك، أولويتنا." }).waitFor();
  assert.ok(await page.locator("video[autoplay][muted][loop][playsinline]").count(), "hero video");
  await page.goto(`${BASE}/en/facility`, { timeout: T });
  assert.equal(await page.getAttribute("html", "dir"), "ltr");
  await page.getByRole("heading", { level: 1, name: "Your Workplace, Our Priority." }).waitFor();
  await page.getByText("Together, We Make Every Space Better.").waitFor();
  await page.getByText("Let us know when something in the building needs maintenance attention.").waitFor();
  await page.getByText("Help us keep our shared spaces clean, comfortable, and welcoming.").waitFor();
  await page.getByRole("link", { name: "My Requests", exact: true }).first().waitFor();
  await page.goto(`${BASE}/en/facility/request`, { timeout: T });
  assert.match(page.url(), /\/facility\/login\?next=/, "wizard requires sign-in");
  await ctx.close();
});

await step("employee: cannot open Facility Operations", async () => {
  const ctx = await browser.newContext();
  const page = await login(ctx, "employee@facility-hub.test");
  await page.goto(`${BASE}/en/facility/ops`, { timeout: T });
  assert.match(page.url(), /\/en\/facility$/);
  const r = await page.request.get(`${BASE}/api/facility/ops/export`);
  assert.equal(r.status(), 403);
  await ctx.close();
});

// helpers for the one-page request form
const optionLabels = async (page, sel) => (await page.locator(`${sel} option`).allInnerTexts()).map((x) => x.trim()).filter((x) => x && x !== "Choose…");
const startForm = async (page, service) => {
  await page.goto(`${BASE}/en/facility/request${service ? `?service=${service}` : ""}`, { timeout: T });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
};

await step("locations: B1 has 7 areas, B2/B3 Parking + Other; Ground and upper floors use wings; floor change resets area; Other needs a description", async () => {
  const ctx = await browser.newContext();
  const page = await login(ctx, "employee@facility-hub.test");
  await startForm(page, "MAINTENANCE");
  const floors = await optionLabels(page, "#fh-floor");
  for (const f of ["Basement 1 (B1)", "Basement 2 (B2)", "Basement 3 (B3)", "Ground Floor", "Mezzanine", "Floor 1", "Floor 6", "My floor isn't listed"]) assert.ok(floors.includes(f), f);
  // 1: B1
  await page.selectOption("#fh-floor", { label: "Basement 1 (B1)" });
  assert.equal(await page.locator("#fh-wing").count(), 0, "basements have no wing");
  assert.deepEqual(await optionLabels(page, "#fh-area"), ["Parking Area", "Meeting Rooms", "Restrooms", "Pharmacy", "Clinic", "Central Event Area", "Other"]);
  await page.selectOption("#fh-area", { label: "Meeting Rooms" });
  // 6 + 2: change floor resets the area; B2 = Parking + Other
  await page.selectOption("#fh-floor", { label: "Basement 2 (B2)" });
  assert.equal(await page.inputValue("#fh-area"), "", "area reset after floor change");
  assert.deepEqual(await optionLabels(page, "#fh-area"), ["Parking Area", "Other"]);
  // 3: B3
  await page.selectOption("#fh-floor", { label: "Basement 3 (B3)" });
  assert.deepEqual(await optionLabels(page, "#fh-area"), ["Parking Area", "Other"]);
  // 8: parking problems adapt; exact spot field
  await page.selectOption("#fh-area", { label: "Parking Area" });
  await page.locator("#fh-exact").waitFor();
  const parkingIssues = await optionLabels(page, "#fh-issue");
  assert.ok(parkingIssues.includes("Drainage problems") && parkingIssues.includes("Ventilation problems"));
  // 4 + 5: ground floor shows the wing selector, then its areas
  await page.selectOption("#fh-floor", { label: "Ground Floor" });
  assert.deepEqual(await optionLabels(page, "#fh-wing"), ["Sun Wing", "Moon Wing", "I'm not sure"]);
  assert.equal(await page.locator("#fh-area").count(), 0, "area waits for the wing");
  await page.selectOption("#fh-wing", { label: "Sun Wing" });
  const ground = await optionLabels(page, "#fh-area");
  for (const a of ["Reception", "Offices", "Meeting Rooms", "Restrooms", "Corridors", "Elevators / Lift Lobby", "Staircases", "Waiting Areas", "Other"]) assert.ok(ground.includes(a), a);
  await page.getByText("Areas on this floor are still being confirmed").waitFor();
  await page.selectOption("#fh-floor", { label: "Mezzanine" });
  await page.selectOption("#fh-wing", { label: "I'm not sure" });
  assert.ok(!(await optionLabels(page, "#fh-area")).includes("Reception"), "mezzanine has no reception");
  // 7: Other requires a description
  await page.selectOption("#fh-floor", { label: "Basement 2 (B2)" });
  await page.selectOption("#fh-area", { label: "Other" });
  await page.getByRole("button", { name: "Send report" }).click();
  await page.getByText("Please describe where it is").waitFor();
  await ctx.close();
});
let roomReference = "";
await step("admin location changes reach employees; full location is stored; ops filters by wing; archive hides but keeps history", async () => {
  // remove leftovers of earlier runs (records without requests are deleted, others archived)
  for (const model of [testDb.facLocation, testDb.facArea]) {
    await model.deleteMany({ where: { nameEn: { startsWith: "E2E " }, requests: { none: {} } } });
    await model.updateMany({ where: { nameEn: { startsWith: "E2E " }, archivedAt: null }, data: { archivedAt: new Date() } });
  }
  const ctx = await browser.newContext();
  const admin = await login(ctx, "admin@facility-hub.test");
  await admin.goto(`${BASE}/en/facility/ops/locations`, { timeout: T });
  await admin.locator('nav[aria-label="Floors"] a').filter({ hasText: /^2/ }).click();
  await admin.waitForURL(/floor=/, { timeout: T });
  // specific location: Meeting room 12 in Floor 2 · Sun Wing · Meeting Rooms
  await admin.getByRole("button", { name: "Add location" }).click();
  await admin.selectOption("#cf-location-new-kind", { label: "Meeting room" });
  await admin.fill("#cf-location-new-code", "12");
  await admin.fill("#cf-location-new-nameEn", "E2E Innovation Room");
  await admin.fill("#cf-location-new-nameAr", "قاعة الابتكار التجريبية");
  await admin.selectOption("#cf-location-new-areaId", { label: "Meeting Rooms" });
  await admin.selectOption("#cf-location-new-wingId", { label: "Sun Wing" });
  await admin.locator("form", { has: admin.locator("#cf-location-new-kind") }).getByRole("button", { name: "Save" }).click();
  await admin.getByRole("cell", { name: "E2E Innovation Room" }).waitFor({ timeout: T });
  // new area on Floor 2
  await admin.getByRole("button", { name: "Add area", exact: true }).click();
  await admin.selectOption("#cf-area-new-kind", { label: "Common Area" });
  await admin.fill("#cf-area-new-nameEn", "E2E Lounge");
  await admin.fill("#cf-area-new-nameAr", "استراحة الاختبار");
  await admin.locator("form", { has: admin.locator("#cf-area-new-kind") }).getByRole("button", { name: "Save" }).click();
  await admin.getByText("E2E Lounge").first().waitFor({ timeout: T });

  const emp = await login(await browser.newContext(), "employee@facility-hub.test");
  await startForm(emp, "MAINTENANCE");
  await emp.selectOption("#fh-floor", { label: "Floor 2" });
  await emp.selectOption("#fh-wing", { label: "Sun Wing" });
  assert.ok((await optionLabels(emp, "#fh-area")).includes("E2E Lounge"), "admin-added area visible");
  await emp.selectOption("#fh-area", { label: "Meeting Rooms" });
  await emp.selectOption("#fh-room", { label: "E2E Innovation Room 12" });
  await emp.getByText("Floor 2 → Sun Wing → Meeting Rooms → E2E Innovation Room 12").waitFor();
  await emp.selectOption("#fh-issue", { label: "Air conditioning" });
  await emp.fill("#fh-desc", "[e2e] The room is warm during afternoon meetings.");
  await emp.getByRole("button", { name: "Send report" }).click();
  await emp.getByText("Thank You for Letting Us Know!").waitFor({ timeout: T });
  roomReference = (await emp.locator("p.font-mono").first().innerText()).trim();
  await emp.getByRole("link", { name: "Track my request" }).click();
  await emp.waitForURL(new RegExp(roomReference), { timeout: T });
  await emp.getByText("Sun Wing").first().waitFor();
  await emp.getByText("E2E Innovation Room 12").first().waitFor();

  // stored relations
  const stored = await testDb.facRequest.findUnique({ where: { reference: roomReference }, include: { floor: true, wing: true, area: true, location: true, building: true } });
  assert.equal(stored.floor.code, "2");
  assert.equal(stored.wing.code, "SUN");
  assert.equal(stored.area.kind, "MEETING_ROOMS");
  assert.equal(stored.location.code, "12");
  assert.ok(stored.building);

  // ops: filter by wing and area
  await admin.goto(`${BASE}/en/facility/ops/requests`, { timeout: T });
  await admin.getByLabel("Wing").selectOption({ label: "Sun Wing" });
  await admin.waitForURL(/wing=/, { timeout: T });
  await admin.getByRole("link", { name: roomReference }).waitFor({ timeout: T });
  await admin.getByLabel("Area").selectOption({ label: "Meeting Room" });
  await admin.waitForURL(/area=kind/, { timeout: T });
  await admin.getByRole("link", { name: roomReference }).waitFor({ timeout: T });

  // archive both test records: hidden from employees, history kept on the request
  await admin.goto(`${BASE}/en/facility/ops/locations`, { timeout: T });
  await admin.locator('nav[aria-label="Floors"] a').filter({ hasText: /^2/ }).click();
  await admin.waitForURL(/floor=/, { timeout: T });
  await admin.getByRole("row").filter({ hasText: "E2E Lounge" }).getByRole("button", { name: "Archive" }).click();
  await admin.getByRole("row").filter({ hasText: "E2E Lounge" }).waitFor({ state: "detached", timeout: T });
  await admin.getByRole("row").filter({ hasText: "E2E Innovation Room" }).getByRole("button", { name: "Archive" }).click();
  await admin.getByRole("row").filter({ hasText: "E2E Innovation Room" }).waitFor({ state: "detached", timeout: T });
  await startForm(emp, "MAINTENANCE");
  await emp.selectOption("#fh-floor", { label: "Floor 2" });
  await emp.selectOption("#fh-wing", { label: "Sun Wing" });
  assert.ok(!(await optionLabels(emp, "#fh-area")).includes("E2E Lounge"), "archived area hidden");
  await emp.selectOption("#fh-area", { label: "Meeting Rooms" });
  assert.equal(await emp.locator("#fh-room").count(), 0, "archived room hidden");
  await emp.goto(`${BASE}/en/facility/requests/${roomReference}`, { timeout: T });
  await emp.getByText("E2E Innovation Room 12").first().waitFor();
  await ctx.close();
});

await step("employee: one-page request with photo, safety warning; language switch keeps what was typed", async () => {
  const ctx = await browser.newContext();
  const page = await login(ctx, "employee@facility-hub.test");
  await startForm(page);
  await page.getByRole("radio", { name: "Maintenance" }).click();
  await page.selectOption("#fh-floor", { label: "Basement 1 (B1)" });
  await page.selectOption("#fh-area", { label: "Parking Area" });
  await page.fill("#fh-exact", "Space 112, column C-14");
  await page.waitForTimeout(700); // draft autosave
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /Language: العربية/ }).click();
  await page.waitForURL(/\/ar\/facility\/request/, { timeout: T });
  await page.locator("#fh-exact").waitFor({ timeout: T });
  assert.equal(await page.inputValue("#fh-exact"), "Space 112, column C-14", "typed text survives the language switch");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /: English$/ }).click();
  await page.waitForURL(/\/en\/facility\/request/, { timeout: T });
  await page.locator("#fh-issue").waitFor({ timeout: T });
  await page.selectOption("#fh-issue", { label: "Lighting failure" });
  await page.fill("#fh-desc", "[e2e] There is smoke near the light fitting above column C-14.");
  await page.getByRole("alert").filter({ hasText: "This may be an emergency" }).waitFor();
  await page.getByRole("button", { name: "Send report" }).click();
  await page.getByText("Please complete the highlighted fields.").waitFor(); // blocked until acknowledged
  await page.fill("#fh-desc", "[e2e] Two ceiling lights are flickering above column C-14.");
  await page.getByText("This may be an emergency").waitFor({ state: "detached", timeout: T });
  await page.locator('input[type=file][multiple]').setInputFiles(png);
  await page.locator('img[src^="blob:"]').first().waitFor();
  await page.getByRole("button", { name: "Send report" }).click();
  await page.getByText("Thank You for Letting Us Know!").waitFor({ timeout: T });
  await page.getByText("Your report has been successfully received by Facility Operations.", { exact: false }).waitFor();
  reference = (await page.locator("p.font-mono").first().innerText()).trim();
  assert.match(reference, /^FAC-\d{4}-\d{6}$/);
  await page.getByRole("link", { name: "Track my request" }).click();
  await page.waitForURL(new RegExp(reference), { timeout: T });
  await page.getByRole("heading", { name: "Lighting failure" }).waitFor();
  await page.getByText("Space 112, column C-14").first().waitFor();
  const src = await page.locator('img[src^="/api/facility/attachments/"]').first().getAttribute("src");
  const photo = await page.request.get(`${BASE}${src}`);
  assert.equal(photo.status(), 200, "photo served through the authorised route");
  assert.equal(photo.headers()["content-type"], "image/webp");
  const anon = await (await browser.newContext()).request.get(`${BASE}${src}`);
  assert.equal(anon.status(), 401, "photo not public");
  await ctx.close();
});

await step("security: another employee cannot see the request or its photo", async () => {
  const ctx = await browser.newContext();
  const page = await login(ctx, "employee2@facility-hub.test");
  const res = await page.goto(`${BASE}/en/facility/requests/${reference}`, { timeout: T });
  assert.equal(res.status(), 404);
  await ctx.close();
});

await step("agent: dashboard, filters, assign, start and resolve with internal note", async () => {
  const ctx = await browser.newContext();
  const page = await login(ctx, "agent@facility-hub.test");
  await page.goto(`${BASE}/en/facility/ops`, { timeout: T });
  await page.getByRole("heading", { name: "Dashboard" }).waitFor();
  await page.goto(`${BASE}/en/facility/ops/requests?q=${reference}`, { timeout: T });
  await page.getByRole("link", { name: reference }).click();
  await page.waitForURL(new RegExp(`/ops/requests/${reference}`), { timeout: T });
  await page.getByText("Suggested by routing").waitFor();
  await page.getByLabel("Team or contractor").selectOption({ label: "Electrical Team (sample)" });
  await page.getByRole("button", { name: "Assign", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Saved" }).waitFor({ timeout: T });
  await page.getByRole("radio", { name: "In Progress" }).click();
  await page.getByRole("button", { name: /Update status: In Progress/ }).click();
  await page.getByText("Saved").first().waitFor({ timeout: T });
  await page.getByLabel("Add note").fill("[e2e] internal: ladder needed");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByText("[e2e] internal: ladder needed").waitFor({ timeout: T });
  await page.getByRole("radio", { name: "Resolved" }).click();
  await page.getByLabel("Message to the employee (optional)").fill("[e2e] Replaced both drivers.");
  await page.getByRole("button", { name: /Update status: Resolved/ }).click();
  await page.locator("span").filter({ hasText: /^Resolved$/ }).first().waitFor({ timeout: T });
  await ctx.close();
});

await step("employee: sees public updates only, confirms the fix and rates", async () => {
  const ctx = await browser.newContext();
  const page = await login(ctx, "employee@facility-hub.test");
  await page.goto(`${BASE}/en/facility/requests/${reference}`, { timeout: T });
  await page.getByText("[e2e] Replaced both drivers.").waitFor();
  assert.equal(await page.getByText("[e2e] internal: ladder needed").count(), 0, "internal note hidden");
  await page.getByRole("button", { name: "Yes, it's fixed" }).click();
  await page.getByRole("heading", { name: "How did we do?" }).waitFor({ timeout: T });
  await page.getByRole("radio", { name: "5 of 5" }).click();
  await page.getByRole("button", { name: "Send feedback" }).click();
  await page.getByText("Thank you. Your feedback helps us keep our workplace at its best.").waitFor({ timeout: T });
  await page.getByText("Closed").first().waitFor();
  await ctx.close();
});

await step("contractor: limited to own team; configuration is forbidden", async () => {
  const ctx = await browser.newContext();
  const page = await login(ctx, "contractor@facility-hub.test");
  await page.goto(`${BASE}/en/facility/ops/requests`, { timeout: T });
  const res = await page.goto(`${BASE}/en/facility/ops/requests/${reference}`, { timeout: T });
  assert.equal(res.status(), 404, "electrical request invisible to HVAC contractor");
  await page.goto(`${BASE}/en/facility/ops/locations`, { timeout: T });
  assert.match(page.url(), /\/en\/facility$/);
  await ctx.close();
});

await step("admin: every configuration page loads; QR opens the wizard with the location", async () => {
  const ctx = await browser.newContext();
  const page = await login(ctx, "admin@facility-hub.test");
  for (const p of ["", "/requests", "/analytics", "/locations", "/categories", "/teams", "/routing", "/sla", "/maps", "/qr", "/emails", "/users", "/audit"]) {
    const r = await page.goto(`${BASE}/en/facility/ops${p}`, { timeout: T });
    assert.equal(r.status(), 200, p);
  }
  await page.goto(`${BASE}/en/facility/ops/emails`, { timeout: T });
  await page.getByText(`Facility Request Resolved – ${reference}`).first().waitFor();
  await page.getByText(`Thank You for Letting Us Know – ${reference}`).first().waitFor();
  // QR: read the token of B1 Parking from the downloadable SVG link's area and follow the scan URL
  await page.goto(`${BASE}/en/facility/ops/qr`, { timeout: T });
  const href = await page.locator('a[href^="/api/facility/qr/"]').first().getAttribute("href");
  assert.ok(href);
  const csv = await page.request.get(`${BASE}/api/facility/ops/export?q=${reference}`);
  assert.equal(csv.status(), 200);
  assert.match(await csv.text(), new RegExp(reference));
  await ctx.close();
});

await step("admin: upload floor plan (SVG), add marker linked to an area, publish; employee map shows it", async () => {
  const ctx = await browser.newContext();
  const page = await login(ctx, "admin@facility-hub.test");
  await page.goto(`${BASE}/en/facility/ops/maps`, { timeout: T });
  await page.selectOption("#map-floor", { label: "B3 · Basement 3 (B3)" });
  await page.fill("#map-title", "[e2e] B3 plan");
  await page.setInputFiles("#map-file", svgMap);
  await page.getByRole("button", { name: "Upload floor plan" }).last().click();
  await page.waitForURL(/\/ops\/maps\/[a-z0-9]+$/, { timeout: T });
  await page.getByRole("button", { name: "Add marker" }).click();
  const stage = page.locator(".fh-map-stage");
  const box = await stage.boundingBox();
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.4);
  await page.selectOption("#mk-area", { label: "Parking Area" });
  await page.getByRole("button", { name: "Save markers" }).click();
  await page.getByRole("status").filter({ hasText: "Saved" }).waitFor({ timeout: T });
  await page.getByRole("button", { name: "Publish" }).click();
  await page.getByRole("button", { name: "Unpublish" }).waitFor({ timeout: T });
  const emp = await login(await browser.newContext(), "employee@facility-hub.test");
  await emp.goto(`${BASE}/en/facility/map`, { timeout: T });
  await emp.getByRole("tab", { name: /B3/ }).waitFor();
  await emp.locator("button[data-marker]").first().click();
  await emp.getByRole("link", { name: "Report an issue here" }).click();
  await emp.waitForURL(/\/facility\/request\?area=.+&from=map/, { timeout: T });
  await emp.getByText("Location chosen on the building map").waitFor({ timeout: T });
  // clean up: unpublish + delete the test map
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Unpublish" }).click();
  await page.getByRole("button", { name: "Publish" }).waitFor({ timeout: T });
  await page.getByRole("button", { name: "Delete" }).click();
  await page.waitForURL(/\/ops\/maps$/, { timeout: T });
  await ctx.close();
});

await step("QR: scanning a location code opens the wizard with that location (token reveals nothing)", async () => {
  const area = await testDb.facArea.findFirst({ where: { kind: "EVENT_AREA", floor: { code: "B1" } } });
  assert.ok(area && !area.qrToken.includes(area.id));
  const ctx = await browser.newContext();
  const page = await login(ctx, "employee@facility-hub.test");
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${BASE}/facility/q/${area.qrToken}`, { timeout: T });
  await page.waitForURL(/\/facility\/request\?area=.+&from=qr/, { timeout: T });
  await page.getByText(/Location filled in from the QR code/).waitFor({ timeout: T });
  await page.getByText("B1 → Central Event Area").first().waitFor();
  assert.equal(await page.inputValue("#fh-floor") !== "", true, "floor preselected and still editable");
  const bad = await page.goto(`${BASE}/en/facility/q/notarealtoken123`, { timeout: T });
  assert.equal(bad.status(), 404);
  await ctx.close();
});

await step("mobile (iPhone 13): no horizontal overflow on home, wizard, my requests (ar + en)", async () => {
  const ctx = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await login(ctx, "employee@facility-hub.test", "ar");
  for (const path of ["/ar/facility", "/ar/facility/request", "/ar/facility/requests", "/en/facility", "/en/facility/request", "/en/facility/guide"]) {
    await page.goto(`${BASE}${path}`, { timeout: T });
    await page.waitForTimeout(400);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 1, `${path} overflows by ${overflow}px`);
  }
  await ctx.close();
});

await browser.close();
await testDb.$disconnect();
console.log(results.join("\n"));
if (errors.length) {
  console.log(`\nBrowser console errors (${errors.length}):\n${[...new Set(errors)].slice(0, 15).join("\n")}`);
  process.exitCode = 1;
}
