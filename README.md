# LabSouq — لاب سوق

Scientific & engineering equipment marketplace (Oman → GCC). Arabic (RTL, default) and English (LTR).

> Status: showcase + control panel — see `DEVELOPMENT_PLAN.md` and `DEVELOPMENT_STATUS.md`.

## Omantel Facility Hub
Facility maintenance & cleaning requests with a Facility Operations command center — `/ar/facility`, `/en/facility`,
operations at `/ar/facility/ops`. Full guide, roles, sample accounts and the production integration checklist:
**[docs/FACILITY_HUB.md](docs/FACILITY_HUB.md)**.

## Requirements
- Node.js 22+
- npm 10+
- PostgreSQL 16

## First-time setup
```bash
npm install
cp .env.example .env          # then edit DATABASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters)
npm run db:deploy             # create the tables
npm run db:seed               # load categories, the 55 published devices, the 26 review items and the first admin
npm run dev                   # http://localhost:3000 → redirects to /ar
```
The seed is safe to run again: it never duplicates devices and never overwrites edits made in the control panel.

## Everyday commands
```bash
npm run lint
npm run typecheck
npm run build && npm run start
npm run db:migrate            # after changing prisma/schema.prisma (development)
```

## Control panel
- Address: `/ar/admin` (Arabic) or `/en/admin` (English). Sign in with the admin created by the seed.
- **Devices**: edit names, brand/model, category, 3D model type, **condition**, **quantity in stock**
  (every change is recorded with a reason in the stock history), **estimated market price**, and the
  student explanation (description, uses, benefits) in both languages.
- **Photos**: upload (JPEG/PNG/WebP up to 8 MB, re-encoded to WebP) or pick any of the 82 workbook photos.
- **Review queue**: the 26 workbook items whose photo was not confirmed. Choose the right photo, fill the
  Arabic name and category, then **Publish**. Publishing requires an Arabic name, an English name and a category.
- **Visibility**: Publish / Unpublish / Archive / Restore. Only published devices appear on the website.
- **Activity log**: who changed what and when (sign-ins, edits with before → after, photos, status).
- **3D models** (per device): upload a GLB of the actual device, name every part (Arabic/English, function,
  take-apart direction) with a live preview, then publish after confirming it shows the actual device. Versions are kept.
- **Website** (admins): brand, logo, colours, animations, homepage texts and sections, footer/contact; save draft,
  preview on desktop/tablet/mobile, publish, restore older versions, undo/redo.
- **Users** (admins): add editors/admins, disable, change role, set a new password.
- **My account**: change password (signs out other sessions).
- The website updates immediately after each save.

## Security notes
- Passwords hashed with Argon2id; sessions stored server-side (only a SHA-256 of the cookie token is kept),
  httpOnly + SameSite=Lax cookie (+ Secure in production), 7-day expiry.
- Every admin page and server action checks the session on the server; the middleware redirect is only a convenience.
- Login is rate-limited (5 attempts per e-mail and 20 per IP per 15 minutes), stored in PostgreSQL so it works
  across several server instances.
- Server actions include Next.js origin checks (CSRF protection). Uploaded images are validated by decoding
  them, not by file name. Admin pages are `noindex`.

## Backup and restore
```bash
pg_dump --format=custom --file=labsouq-$(date +%F).dump "$DATABASE_URL"
pg_restore --clean --if-exists --dbname="$DATABASE_URL" labsouq-YYYY-MM-DD.dump
```
Also back up the `UPLOAD_DIR` folder (uploaded photos).

## Deployment
Full step-by-step guide (Arabic): **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**
- **Vercel + Neon + Cloudflare R2**: build command `npm run vercel-build` (runs migrations, then builds).
  Set `DATABASE_URL`, `DIRECT_URL`, `SITE_URL` and the `S3_*` variables.
- **Private server (Docker)**: `docker compose build && docker compose run --rm setup && docker compose up -d`
  (PostgreSQL + app + Caddy with automatic HTTPS). Health check: `/api/health`.

### File storage
Uploaded photos and 3D models are always referenced as `/media/<key>` and served by the app, so the back-end can change
without breaking links: local disk (`UPLOAD_DIR`, default) or any S3-compatible bucket when `S3_BUCKET` is set
(required on Vercel).
