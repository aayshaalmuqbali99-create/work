# LabSouq — Development Status

_Last updated: 2026-11-08_

## Completed
- Phase 1 — project and workbook inspection (see `DEVELOPMENT_PLAN.md` §1).
- Workbook saved at `data/inventory.xlsx`.
- Photo-to-item mapping reviewed visually: `data/photo-mapping.json` (56 CLEAR, 23 NEEDS_REVIEW, 3 NO_PHOTO).

- Phase 2 (part 1): Next.js 15 + TypeScript + Tailwind 4 scaffold; design tokens; Arabic (RTL, default) /
  English (LTR) routing with next-intl; Arabic/English segmented switch in header and footer that keeps the
  current page, query and #section; responsive header with animated mobile menu; footer; home page
  (hero, categories, why, how it works); About page. Verified: lint, typecheck, build, Playwright
  (language switching, dir/lang attributes, no horizontal overflow on iPhone 13, no console errors).

- Showcase release (see DEVELOPMENT_PLAN.md §6):
  - `scripts/build_catalog.py` builds `src/data/equipment.json` + `public/equipment/*.jpg` from the workbook,
    the reviewed photo mapping and `content/equipment-details.json` (55 devices / 416 units).
  - Equipment catalogue `/[locale]/equipment`: search (Arabic + English, brand, model, type synonyms),
    category filter (kept in the URL), sorting; device cards with photo, quantity, estimated market price.
  - Device page `/[locale]/equipment/[slug]`: quantity, condition, estimated market price with note,
    interactive 3D viewer first, explanation, uses, student benefits, inventory photo, facts, pricing notes.
  - `InteractiveEquipmentViewer`: rotate/zoom/pan, front/rear/top/side/isometric, reset, fullscreen,
    take apart / reassemble, pause/resume, speed + distance sliders, part labels (AR/EN), click-to-select
    with highlight + camera focus + info panel (name AR/EN, function, hierarchy, related parts),
    component tree with show/hide/isolate/show all/hide all, WebGL fallback to photo, reduced-motion support.
    16 illustrative device-type models.
  - Home: featured devices, live device/unit counts, categories with counts linking to the filtered catalogue.
  - Verified with Playwright (desktop + iPhone 13, ar + en): viewer actions, filters, search, language switch, no console errors.

- Phase 3 (database + control panel):
  - PostgreSQL 16 + Prisma 6: User, Session, Category, Device, DeviceImage, InventoryTransaction, AuditLog.
  - Idempotent seed: 7 categories, 55 published devices (416 units), 26 review-queue items (236 units), first admin.
  - Public pages read from the database through a cached data layer (tag `catalog`, refreshed on every admin save).
  - Auth: Argon2id, DB sessions, rate-limited login, server-side checks in every admin page/action, middleware redirect.
  - Control panel (`/ar/admin`, `/en/admin`, fully bilingual/RTL): dashboard KPIs, device list with status tabs and
    search, device editor (all fields incl. condition, quantity with reason → stock ledger, market price, AR/EN content),
    publish/unpublish/archive/restore with publish validation, photo upload or pick from 82 workbook photos,
    stock history, activity log with before → after, change password, logout.
  - Verified end-to-end with Playwright (login fail/success, edit + validation keeps input, public page updates,
    review item publish flow, upload valid/invalid image, English admin, logout/guard). Test edits were reverted.

- Phase 4 (owner request: all four):
  - Users: admin-only management of editors/admins with guard rails (last admin, self), disable signs out.
  - Real 3D models: Device3DModel versions, server-side GLB validation, part editor with live preview,
    verified publishing (explicit confirmation), public viewer loads verified GLB; original demo GLB generator.
  - Website editor: SiteVersion draft/published/archived, brand/logo/colours (contrast check)/animations,
    hero texts, sections show/hide/reorder/titles, footer & contact, undo/redo, device-size preview via
    Next.js draft mode, publish with note, restore versions.
  - Deployment readiness: S3-compatible storage behind stable `/media` URLs (tested against an S3-compatible
    test server), PostgreSQL-backed rate limiting, `DIRECT_URL`, `vercel-build`, Dockerfile (standalone) +
    docker-compose (Postgres + app + Caddy HTTPS), `/api/health`, sitemap.xml, robots.txt, canonical URLs,
    Arabic deployment guide `docs/DEPLOYMENT.md`. Standalone server tested end to end; Docker image itself not
    built here (no Docker daemon in this environment).

## In progress
- Phase 2 (part 2): shadcn/ui base components (button, input, card, dialog), full design-system page.
- Open questions in `DEVELOPMENT_PLAN.md` §4 (hosting, storage, seller name, item 26/82, email).

## Not started
- Phases 3–10.

## Known issues / risks
- The Docker image has not been built in this environment (no Docker daemon); the standalone server it runs was tested.
- S3 storage was tested against a minimal S3-compatible test server, not yet against a real R2/S3 bucket.
- Forms use server actions + Zod with React 19 `useActionState` instead of React Hook Form (fewer dependencies, same validation on the server).
- Photo numbering in sheet `All Photos` does not consistently match `Item No.` in sheet `Houd`
  (shifted ranges, 2 duplicate images, 1 off-grid image, items 1 and 76 apparently without a photo).
  Photo mapping must be confirmed manually in the importer.
- Workbook has no brand, model, condition, specification or location data.

## Next step
- Owner review of device texts and 3D models; owner works through the review queue.
- Owner: choose hosting (Vercel+Neon+R2 or VPS), create the accounts, then follow docs/DEPLOYMENT.md.
- Next development: automated test suite in the repo (Playwright), category management, quotation requests.
- Note: category list and navigation are in code for now; they move to the database in Phases 3 and 8.
