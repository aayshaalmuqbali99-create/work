# Omantel Facility Hub

Internal platform for **facility maintenance and cleaning requests** in Omantel buildings, with a separate
**Facility Operations command center**. It is not an IT helpdesk: computers, network, software and
audio-visual equipment are explicitly out of scope (stated in the wizard, the guide and the footer).

- Employee experience: `/ar/facility` (Arabic, RTL, default) and `/en/facility` (English, LTR)
- Facility Operations: `/ar/facility/ops` · `/en/facility/ops`

It lives in the same Next.js application and PostgreSQL database as Omantel Assets, but has its **own users,
sessions, roles and audit trail** (`Fac*` tables). Nothing is shared with the assets control panel except
infrastructure (database connection, file storage, rate limiting).

---

## 1. What is built

| Area | Where | Notes |
|---|---|---|
| Homepage | `src/app/[locale]/facility/(hub)/page.tsx` | Real building video (muted, loop, `playsInline`, poster, paused off-screen, pause button, reduced-motion → real photo), service cards, quick access (incl. in-app QR scanner), recent requests, real building photography, safety notice |
| Request wizard | `src/components/facility/wizard/request-wizard.tsx` | 6 steps: service → location → problem → details → photos → review. Draft auto-saved per user (survives reloads and language switching), animated progress, per-step validation with focus management, live safety detection, camera capture on mobile |
| Location model | `FacBuilding → FacWing → FacFloor → FacArea (nestable)` + per-area detail fields | Entirely database-driven. Initial data = verified basements only |
| Categories | `FacCategory → FacIssue` with `areaKinds` + `floorCodes` | Problems offered depend on the selected area and floor; "Other" areas show all problems |
| My Requests | `/facility/requests` | Search by reference, status/category filters, open/finished tabs, progress bars |
| Request detail | `/facility/requests/[ref]` | Milestones, animated timeline (public events only), photos, comments, confirm / reopen / cancel, star rating |
| E-mail action links | `/facility/action?t=…` | Single-use, hashed, 14-day tokens. The link only opens a page; the change happens on button press (mail scanners can't trigger it) |
| Services guide | `/facility/guide` | Generated from the live configuration |
| Building map | `/facility/map` | Published floor plans only; "Building Map Coming Soon" empty state until one is published |
| Ops dashboard | `/facility/ops` | 10 KPIs (clickable → filtered list), needs-attention list, open by status, open by floor, latest |
| Request management | `/facility/ops/requests`, `/[ref]` | Filters in the URL, pagination, bulk assign, CSV export (formula-injection safe), status changes (transition rules per role), assign, priority (recomputes SLA), escalate, internal/public notes, completion photos, SLA met/missed |
| Analytics | `/facility/ops/analytics` | By floor, category, service, B1/B2/B3, team/contractor, average resolution, SLA compliance, recurring issues, monthly trend — all live database values |
| Configuration | `/facility/ops/{locations,categories,teams,routing,sla,maps,qr,emails,users,audit}` | Add / edit / deactivate / reorder without code |
| Map editor | `/facility/ops/maps/[id]` | Upload PNG/JPG/WebP or approved SVG per floor, place markers, draw zones, link to areas, bilingual labels, colours, preview, publish / unpublish, delete |
| QR codes | `/facility/ops/qr` | Printable sheet + SVG download per area; codes contain a random token only; regenerate to revoke |

### Verified initial configuration (seed)
- **B1**: Parking Area, Meeting Rooms, Restrooms, Pharmacy, Clinic, Central Event Area (described as "in the middle of B1"), Other.
  Pharmacy and Clinic carry a scope note: non-clinical facility work only.
- **B2**: Parking Area, Other. **B3**: Parking Area, Other.
- Sun and Moon wings exist as configurable wings; no floors are assigned to them yet.
- No room numbers, coordinates, upper floors or contractual SLAs are invented. Ground, Mezzanine and upper floors are added in
  *Locations* once verified.

### Statuses and rules
`SUBMITTED, UNDER_REVIEW, ASSIGNED, IN_PROGRESS, ON_HOLD, RESOLVED, CLOSED, REOPENED, CANCELLED, REJECTED` — transitions in
`src/features/facility/domain/status.ts`. Contractors may only move their team's requests to In Progress / On Hold / Resolved.
Employees cancel before work starts, confirm (Resolved → Closed) and reopen within the configurable window (default 7 days).

### Reference numbers
`FAC-YYYY-000001`, allocated inside the creation transaction with an atomic `INSERT … ON CONFLICT … RETURNING` on
`FacCounter` (safe under concurrency). The year follows the business time zone.

### Emergency safety
Problems flagged `safetyRisk` and descriptions mentioning smoke/burning, exposed wiring, water near electricity, blocked
exits, elevator entrapment or gas (English and Arabic) show an urgent warning instructing the employee to contact building
security / emergency services through verified channels. The employee must acknowledge it before continuing. The verified
contact text is configured in *SLA & Calendar*; until it is provided, the warning tells people to use the numbers posted in
the building (no numbers are invented).

---

## 2. Roles and security

| Role | Can |
|---|---|
| EMPLOYEE | Submit, see and act on **own** requests only |
| CONTRACTOR | Ops views limited to requests of **their team**; status (in progress / on hold / resolved), notes, completion photos |
| AGENT | All requests: review, assign, prioritise, escalate, status, notes, analytics |
| ADMIN | Everything + configuration, users and roles, audit log |

- Every page and server action checks the role **on the server** (`requireFac` / `requireFacPage`); the middleware redirect is only a convenience.
- Request queries always include the visibility filter (`visibleWhere`). Employees never receive internal events.
- Request photos and floor plans are **private**: stored under `facility/` and `facmaps/`, blocked on `/media`, served only by
  `/api/facility/attachments/[id]` and `/api/facility/maps/[id]/image` after an access check, with a sandboxing CSP.
- Uploaded photos are decoded and re-encoded (metadata stripped). SVG floor plans are rejected if they contain scripts, event
  handlers, external references, `foreignObject` or entities.
- Sessions: random 256-bit token, only its SHA-256 stored, httpOnly + SameSite=Lax (+ Secure in production), 12 h.
- Rate limits (PostgreSQL-backed): sign-in, submissions (15/h per user), comments.
- Audit log of sign-ins, every request action, every configuration change and exports.

---

## 3. Running locally

```bash
npm install
cp .env.example .env            # set DATABASE_URL
npm run db:deploy
npm run db:seed                 # assets data + Facility Hub configuration + flagged sample data
npm run dev                     # http://localhost:3000/ar/facility
```

### Development sample accounts
Created only when `NODE_ENV` is not `production` and `FAC_SAMPLE_DATA` is not `false`. Password: `FAC_DEV_PASSWORD`
(default `FacilityHub-Dev-2026`). They use the reserved `.test` domain and are tagged **Sample** in the UI.

| E-mail | Role |
|---|---|
| employee@facility-hub.test | Employee |
| employee2@facility-hub.test | Employee |
| agent@facility-hub.test | Operations agent |
| admin@facility-hub.test | Operations admin |
| contractor@facility-hub.test | Contractor (sample HVAC team) |

Sample teams, routing rules, **sample SLA targets** (marked "Sample — not contractual") and 16 sample requests are also seeded.
Remove sample requests from the dashboard (**Remove sample requests**) and replace SLA values in *SLA & Calendar*.

### Tests
```bash
npm test                                         # domain unit tests (SLA business hours, safety detection, transitions, permissions, SVG validation…)
BASE_URL=http://localhost:3000 npm run test:e2e  # Playwright end-to-end: employee, agent, contractor and admin workflows, AR/EN, mobile
npm run lint && npm run typecheck && npm run build
```

---

## 4. Production integrations — what Omantel must provide

Nothing below is invented in the code; each item has a safe local fallback.

| Integration | Needed from Omantel | Configure | Fallback until then |
|---|---|---|---|
| **Microsoft Entra ID SSO** | App registration (web), redirect URI `https://<host>/api/facility/auth/entra/callback`, delegated `User.Read`, client secret | `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET`, optional `ENTRA_ALLOWED_DOMAINS` | Development sign-in (disabled in production unless `FAC_DEV_LOGIN=true`) |
| First administrator | E-mail of the Facility Operations admin | `FAC_BOOTSTRAP_ADMIN_EMAIL` then `npm run db:seed` | — |
| **Microsoft Graph e-mail** | Application permission `Mail.Send` (admin consent, ideally restricted with an Application Access Policy to one mailbox) and a sender mailbox | `EMAIL_TRANSPORT=graph`, `GRAPH_SENDER`, optional `GRAPH_TENANT_ID/CLIENT_ID/CLIENT_SECRET` (default to the Entra values) | `log`: e-mails are queued and visible in *E-mails → Outbox* but not delivered |
| Background jobs | A scheduler calling `GET /api/facility/jobs` every 5 minutes with `Authorization: Bearer $FAC_CRON_SECRET` | `FAC_CRON_SECRET` | E-mails are also sent right after each action (`after()`); overdue sweeps need the job |
| File storage | S3-compatible bucket (private) | `S3_*` variables (shared with Omantel Assets) | Local disk (`UPLOAD_DIR`) |
| Approved SLA targets, business hours, holidays | Contractual / internal targets | *SLA & Calendar* | Sample values flagged in the UI |
| Contractors and scope | Confirmed scope (e.g. Bahwan) | *Teams & Contractors* → "Scope confirmed" | Unconfirmed contractors cannot be assigned or routed |
| Verified emergency contact | Building security / emergency number text | *SLA & Calendar* | "Use the numbers posted in your building" |
| Building map | Approved floor plans per floor | *Building maps* | "Building Map Coming Soon"; the location dropdowns work without maps |
| Remaining floors and wings | Verified layout (Ground, Mezzanine, upper floors, Sun / Moon) | *Locations* | "My floor isn't listed" + free-text location |
| Brand fonts | Licensed FS Alvar / FS Albert web fonts | Add `@font-face` and set `--font-sans` | Inter / IBM Plex Sans Arabic |
| Hero video | Approved building video | `FAC_HERO_VIDEO_URL` (or replace `public/facility/hero.mp4`) | The supplied clip |

> The supplied hero clip is an AI-generated rendering of the building (it carries the generator's watermark). Replace it
> with approved footage before launch.

### Brand
Colours follow the 2024 Omantel Brand Guidelines (Deep Sea `#2D13EA` / Gold Mountains `#FF7800` / White as primaries;
secondaries as accents; tertiaries only for small details; no black backgrounds; no arrow-shaped "spark" layouts). The
logotypes in `public/brand/omantel/` were extracted unaltered from the guidelines PDF (`docs/omantel-brand-guidelines.pdf`):
bilingual logotype for the Arabic interface, Latin logotype for English, and the official white reverse versions on Deep Sea.
