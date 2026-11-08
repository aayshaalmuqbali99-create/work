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
