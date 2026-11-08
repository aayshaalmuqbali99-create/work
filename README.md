# LabSouq — لاب سوق

Scientific & engineering equipment marketplace (Oman → GCC). Arabic (RTL, default) and English (LTR).

> Status: showcase + control panel — see `DEVELOPMENT_PLAN.md` and `DEVELOPMENT_STATUS.md`.

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
- **My account**: change password (signs out other sessions).
- The website updates immediately after each save.

## Security notes
- Passwords hashed with Argon2id; sessions stored server-side (only a SHA-256 of the cookie token is kept),
  httpOnly + SameSite=Lax cookie (+ Secure in production), 7-day expiry.
- Every admin page and server action checks the session on the server; the middleware redirect is only a convenience.
- Login is rate-limited (5 attempts per e-mail and 20 per IP per 15 minutes). The limiter is in-memory:
  use Redis/Upstash if you run more than one server instance.
- Server actions include Next.js origin checks (CSRF protection). Uploaded images are validated by decoding
  them, not by file name. Admin pages are `noindex`.

## Backup and restore
```bash
pg_dump --format=custom --file=labsouq-$(date +%F).dump "$DATABASE_URL"
pg_restore --clean --if-exists --dbname="$DATABASE_URL" labsouq-YYYY-MM-DD.dump
```
Also back up the `UPLOAD_DIR` folder (uploaded photos).

## Deployment checklist
1. A PostgreSQL database and `DATABASE_URL`.
2. `npm ci && npm run db:deploy && npm run db:seed && npm run build && npm run start`.
3. Persistent storage for `UPLOAD_DIR` (or switch `src/lib/storage.ts` to S3/R2/Cloudinary).
4. HTTPS in front of the app (the session cookie is `Secure` in production).

## Equipment catalogue
The database is seeded from files generated from the original workbook (after seeding, edit devices in the control panel):
```bash
python3 scripts/build_catalog.py   # needs: pip install openpyxl pillow
```
- `data/photo-mapping.json` — reviewed photo ↔ item mapping (only `CLEAR` items are published)
- `content/equipment-details.json` — Arabic/English explanation, uses, student benefits, category, 3D type
- 3D device-type models: `src/components/viewer3d/archetypes.ts` (illustrative, labelled as such)

## Languages
- Routes are prefixed: `/ar/...` (Arabic, RTL) and `/en/...` (English, LTR). `/` redirects to `/ar`.
- The Arabic / English switch in the header and footer keeps the current page, query string and `#section`.
- Texts live in `src/messages/ar.json` and `src/messages/en.json` (keys must match in both files).
- Layout uses logical CSS (`ms-*`, `ps-*`, `start-*`, `rtl:` variants) so it mirrors correctly.

## Project structure
```
data/                 original inventory workbook + reviewed photo mapping
src/app/[locale]/     pages (home, about, …)
src/components/       layout/ (header, footer, language switcher), home/ (sections)
src/i18n/             routing, navigation helpers, request config
src/messages/         ar.json, en.json
src/app/globals.css   design tokens (colours, type scale, radius, animations)
```
