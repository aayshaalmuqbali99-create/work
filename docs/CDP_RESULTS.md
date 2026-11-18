# Omantel | CDP Programme Evaluation 2026 — results platform

منصة نتائج تقييم برنامج التطوير الوظيفي 2026. Internal, sign-in required. Arabic (RTL) by default, English switch.

| Address | Who | What |
|---|---|---|
| `/ar/cdp` · `/en/cdp` | any signed-in user (Viewer, Editor, Admin) | results dashboard |
| `/ar/cdp/report?dept=N` | same | printable management export (Print → Save as PDF) |
| `/ar/cdp/thanks` | authorised users; everyone once an admin publishes it | thanks & recognition board |
| `/ar/admin/cdp` | Admin | upload, validate and publish the Excel file |
| `/ar/admin/users` | Admin | add **Viewer (management)** accounts; grant **CDP original data** |

## Updating the data
1. Control panel → **CDP evaluation data** → choose the `.xlsx` → **Upload & validate**.
2. The file is read from `Sheet1` and checked: header row, department column, every question matched by its
   **header text** (spaces and line breaks cleaned; Arabic or English, any order), unrecognised answers, blanks,
   and the reference counts of the `(1-137)` file (135 responses — 1 and 2 were test submissions and were removed). Missing columns are listed as warnings; a missing department
   column or no satisfaction questions block publishing.
3. The dashboard keeps showing the current file until you press **Publish**. Older files stay listed (Previous)
   and can be republished.

Expected Excel letters (`F`…`AW`) are only used to verify the mapping. If a header no longer matches but the file
keeps the reference layout, the column at the expected letter is used and flagged “by position” in the report.

## Privacy
- Respondent name, e-mail, employee number and form metadata columns are **dropped while reading and never stored**;
  the original file is not kept. So they cannot reach the dashboard or the export.
- Comments are stored twice: original (restricted) and with identifying details removed (e-mails, phone/employee
  numbers, words after titles such as Eng./المهندس, and any word that appears in a name field of the same file).
  Redaction is best-effort; management sees only the redacted text.
- Original comments and the “names of people who provided support” (AU) are sent by the server only to Admins and
  users with **CDP original data**. Presentation mode and the PDF export never show them, whoever is signed in.
- Thanks & recognition messages (AV, AW) name people, so management sees only their counts.
- Departments with fewer than 5 responses (`MIN_GROUP_SIZE`) appear in the distribution and overall results, but
  cannot be filtered on their own and their comments carry no department label for management users.

## People who helped the team
In the Huawei OMS tab, under Thanks & recognition: the people named in the “who supported you” answers (AU),
ranked by how many **different** participants named them, with “named more than once” listed first. Names are
pulled out of the free text (titles, “from Huawei/Omantel”, “all the team”… are dropped) and spellings of the same
person are grouped across Arabic and English by a consonant skeleton (e.g. عازب / Azib, ابراهيم المعمري /
Ibrahim AlMamari). Authorised users can **merge** two entries, **rename** one or **hide** an entry that is not a
person (pencil icon); corrections are stored in the database (`SurveyNameRule`) and carry over to newer files.
Management users and the PDF export see only how many people were named and how many were named more than once.

## Thanks & recognition board — `/ar/cdp/thanks`
A page made for the meeting screen or printing: “thank you to everyone who helped their colleagues develop during
CDP 2026”, with the people named by more than one participant as ranked cards (top three highlighted) and everyone
else named once in a “thank you also to” wall. It uses the same corrected list as above (merges, renames, hidden
entries). Visible to authorised users; an admin can press **Publish the board to all platform users** to show it to
management viewers too (and hide it again). Links: the results toolbar and the Thanks & recognition section.

## Editing definitions and texts
- Questions, tab order, header match phrases, theme keywords, answer synonyms, “no comment” words, privacy
  threshold and reference counts: `src/features/cdp/config.ts`.
- Interface texts: `src/messages/ar.json` / `en.json` → `"Cdp"`.
- Colours: `--cdp-*` variables in `src/app/globals.css` (challenge questions use their own palette).
- Logo: the Omantel logo set in Control panel → Website → Brand (partner logo).

## Tests
```bash
npm run test:cdp            # parser, mapping, counts, redaction (synthetic fixture)
npm run cdp:fixture -- --invalid /tmp/cdp-invalid    # rebuild fixture + broken variants
SHOTS=/tmp/cdp-invalid ADMIN_PASSWORD=... npm run test:cdp:e2e   # browser test against `npm start`, empty CDP data
```
`tests/cdp/fixtures/cdp-synthetic-135.xlsx` is **synthetic** (invented names/comments) built to the reference
counts. Upload the real `(1-137)` file once and check the reference panel shows every count as matching.
