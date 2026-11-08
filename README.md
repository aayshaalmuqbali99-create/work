# LabSouq — لاب سوق

Scientific & engineering equipment marketplace (Oman → GCC). Arabic (RTL, default) and English (LTR).

> Status: Phase 2 in progress — see `DEVELOPMENT_PLAN.md` and `DEVELOPMENT_STATUS.md`.

## Requirements
- Node.js 22+
- npm 10+
- PostgreSQL 16 (from Phase 3)

## Development
```bash
npm install
npm run dev        # http://localhost:3000 → redirects to /ar
npm run lint
npm run typecheck
npm run build && npm run start
```

## Equipment catalogue
The showcase is generated from the original workbook — never edit `src/data/equipment.json` by hand:
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
