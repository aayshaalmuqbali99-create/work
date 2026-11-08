# LabSouq — Development Status

_Last updated: 2026-11-08_

## Completed
- Phase 1 — project and workbook inspection (see `DEVELOPMENT_PLAN.md` §1).
- Workbook saved at `data/inventory.xlsx`.
- Photo-to-item mapping reviewed visually: `data/photo-mapping.json` (56 CLEAR, 23 NEEDS_REVIEW, 3 NO_PHOTO).

## In progress
- Waiting for owner approval of `DEVELOPMENT_PLAN.md` and answers to §4 open questions.

## Not started
- Phases 2–10.

## Known issues / risks
- Photo numbering in sheet `All Photos` does not consistently match `Item No.` in sheet `Houd`
  (shifted ranges, 2 duplicate images, 1 off-grid image, items 1 and 76 apparently without a photo).
  Photo mapping must be confirmed manually in the importer.
- Workbook has no brand, model, condition, specification or location data.

## Next step
- On approval: Phase 2 — scaffold Next.js app, design system, Arabic/English i18n.
