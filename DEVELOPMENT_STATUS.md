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

## In progress
- Phase 2 (part 2): shadcn/ui base components (button, input, card, dialog), full design-system page.
- Open questions in `DEVELOPMENT_PLAN.md` §4 (hosting, storage, seller name, item 26/82, email).

## Not started
- Phases 3–10.

## Known issues / risks
- Photo numbering in sheet `All Photos` does not consistently match `Item No.` in sheet `Houd`
  (shifted ranges, 2 duplicate images, 1 off-grid image, items 1 and 76 apparently without a photo).
  Photo mapping must be confirmed manually in the importer.
- Workbook has no brand, model, condition, specification or location data.

## Next step
- Finish Phase 2 components, then Phase 3 — PostgreSQL + Prisma schema, authentication and roles.
- Note: category list and navigation are in code for now; they move to the database in Phases 3 and 8.
