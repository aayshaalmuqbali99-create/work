# LabSouq — Development Plan

> Explore. Understand. Equip.
> Status of this document: **PROPOSED — awaiting owner approval** (no application code written yet).

---

## 1. Phase 1 findings (inspection)

### 1.1 Repository
- Empty repository (only `.git`). Nothing to preserve or migrate.
- Workbook stored at `data/inventory.xlsx` (original name:
  `Inventory_Indicative_Market_Valuation_with_Photos_Updated_New_Prices 100.xlsx`).

### 1.2 Environment
- Node 22.23, npm 10.9, PostgreSQL 16 installed (cluster stopped; can be started for dev/tests).
- Chromium + Playwright available for end-to-end and responsive testing.

### 1.3 Workbook — sheet `Houd`
| Check | Result |
|---|---|
| Columns | `Item No.`, `Description`, `Quantity`, `Indicative New Replacement Unit Price (OMR)`, `New Replacement Total (OMR)` (formula `=C*D`) |
| Item rows | 82 (rows 2–83) |
| Total units | **652** ✔ matches stated total |
| Replacement total | **OMR 68,005** ✔ matches stated total |
| Missing prices / quantities | none |
| Exact duplicate descriptions | none |
| Near-duplicates | Item 26 *BGC-8088 MicroEngineer V3.5 Hardware Training System* (qty 1) vs Item 82 *…Systems* (qty 3) — same model, needs owner decision (merge or keep separate) |
| Other data present | **None**: no brand/model columns, no condition, no specs, no year, no serial numbers, no location |
| Notes rows (85, 86) | Pricing qualification notes — will be preserved verbatim in import documentation and attached to the ImportJob record |

Descriptions are often generic ("Digital Multimeters", "Assorted … Cables", "… or similar").
Brand / model will be **proposed** by a parser (e.g. "Rohde & Schwarz" / "SMT03") and shown to the
admin for confirmation — never written as verified.

### 1.4 Workbook — sheet `All Photos` (⚠ critical finding)
- 82 embedded JPEG images, `OneCellAnchor`, laid out in a 5-column grid with text labels
  `Photo 1 … Photo 82` in the same cells. **The `Houd` sheet has no photo reference column.**
- `Photo 53` label has **no image** in its cell; one image is anchored **off-grid at cell G12**
  (very likely the displaced Photo 53).
- Two pairs of **byte-identical images**: Photo 40 = Photo 41, Photo 76 = Photo 77.
- Visual inspection shows **`Photo N` does NOT reliably equal `Item N`**. Examples:
  - Photo 1 shows FEEDBACK training modules (Item 2); no visible photo of the ultrasonic cleaner (Item 1).
  - Photo 2 shows a Nortel phone (Item 3); Photo 25 shows BGC-8088 (Item 26); Photo 26 shows K&H PLC I/O (Item 27).
  - Photos 40/41 (duplicate) both show the HP oscilloscope (Item 41) — numbering re-aligns from here.
  - Photo 42 = TTi signal generator (Item 42) ✔, Photo 60 = R&S SMT03 (Item 60) ✔.
  - Photo 68 shows multimeters (Item 69), Photo 69 a mobile-phone trainer (Item 70).
  - Photos 76/77 (duplicate) show a hot-air rework station (Item 77); **no visible photo of the Fujikura splicer (Item 76)**.
  - Photo 79 looks like the same DC/DC converter as Photo 21 (different bytes).

**Consequence:** the importer will (1) extract every image with its anchor cell and label, (2) propose a
mapping with a confidence level (label number, detected shift, duplicates flagged), and (3) require the
admin to confirm/correct each association in a visual grid before import. Items without a confirmed
photo import with "Photo not provided". No mapping is applied silently.

---

## 2. Architecture

### 2.1 Stack (pinned stable versions, documented in README)
| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript (strict) | SSR/SEO, server actions, one deployable |
| Styling | Tailwind CSS 4 + shadcn/ui + Lucide | Token-driven design system, owned component source |
| i18n | `next-intl` with `/[locale]/…` routes (`ar` default RTL, `en` LTR) | Real routing, `dir` per locale, localized metadata |
| DB | PostgreSQL 16 + Prisma | Required; migrations + typed client |
| Auth | Own session auth: Argon2id hashing, DB-backed sessions, httpOnly SameSite cookies, CSRF token for mutations, rate limiting | Full ownership, no beta deps, server-side RBAC |
| Validation | Zod (shared client/server) + React Hook Form | One schema per entity |
| 3D | three + @react-three/fiber + @react-three/drei, GLB/glTF, `gltf-transform` for validation/optimisation (Draco/Meshopt, KTX2) | Required stack |
| Animation | Motion (Framer Motion), GSAP only for exploded-view timelines, CSS for micro-interactions; all gated by admin settings + `prefers-reduced-motion` | |
| Page builder | `@dnd-kit` + Zod-validated JSON section configs rendered by a whitelist registry | No HTML/JS injection possible |
| Excel | `exceljs` (reads images + anchors server-side) | SheetJS CE cannot extract images |
| Images | `sharp` (resize/WebP/AVIF) + `next/image` | |
| Storage | `StorageAdapter` interface: `local` (dev) / S3-compatible (R2, S3, MinIO) / Cloudinary for images | Swap by env var, no code change |
| Email | `EmailAdapter`: console (dev) / SMTP or Resend | Needs credentials |
| Payments | `PaymentProvider` interface only, disabled; no card data stored; no simulated success | Oman providers (e.g. Thawani, bank gateways) later |
| Tests | Vitest (unit/integration against real Postgres), Playwright (E2E, desktop/tablet/mobile, ar/en) | |

### 2.2 Key architectural decisions
1. **Price separation** — `ProductPrice` rows with an enum `kind`:
   `INDICATIVE_REPLACEMENT_UNIT | INDICATIVE_REPLACEMENT_TOTAL | ACTUAL_NEW_SELLING | ACTUAL_USED_SELLING | ESTIMATED_RESALE`.
   The public "price" shown on cards is **only** an ACTUAL_* price; if none exists the card shows
   "Price on request". Indicative prices are visible to admins (and optionally, labelled, to buyers).
2. **Unknown ≠ false** — every optional fact (condition, year, warranty, specs, brand) is nullable and
   renders "Not provided / غير متوفر". Condition enum includes `UNVERIFIED` as the import default.
3. **Product vs. stock** — `Product` (the model/listing) is separate from `InventoryTransaction`
   (quantity ledger); current quantity is derived and cached.
4. **3D honesty** — `Product3DModel.status`: `DRAFT | PUBLISHED | ARCHIVED` and `verified` flag. The
   "3D Available" badge appears only for a published, admin-verified model of *that* product. The bundled
   demo model is a `DemoAsset` with a permanent "Demonstration model — not a real product" label.
5. **Draft/publish everywhere content changes** — `ContentVersion` stores JSON snapshots per
   page/theme/settings with `status` (`DRAFT|PUBLISHED|ARCHIVED`), author, timestamp, diff support.
   Public routes read only the published snapshot (cached, revalidated on publish).
6. **Demo data labelled** — seed suppliers/institutions are flagged `isDemo` and badged; no real
   supplier is ever invented or shown as verified.
7. **Idempotent import** — each row gets a stable `sourceKey` (`workbookHash-sheet-itemNo`) with a unique
   constraint; re-import updates instead of duplicating.

### 2.3 Data model (Prisma, ~35 models)
User, Role, Permission, Session, Organization (type: UNIVERSITY | COLLEGE | LAB | COMPANY | SUPPLIER),
OrganizationMember, Product, Category (self-relation for subcategories, ordered), ProductImage,
ProductSpecification, ProductDocument, ProductCondition, ProductPrice, Product3DModel (versions),
ProductComponent (tree via parentId), ComponentRelationship, ComponentAnimation (explode vector,
duration, order), Quotation, QuotationItem, SupplierOffer, Order, OrderItem, OrderStatusHistory,
Favorite, Review, Conversation, Message, Notification, InventoryTransaction, ImportJob, ImportRow,
WebsiteSettings, ThemeSettings, NavigationItem, Page, PageSection, ContentVersion, MediaAsset, AuditLog.
All with timestamps, FK indexes, unique constraints (slugs per locale, sourceKey, favorites), soft delete
(`deletedAt`) on Product, Category, Organization, User, MediaAsset. Bilingual fields as `nameAr`/`nameEn`
pairs. Full-text search via Postgres `tsvector` (English) + `pg_trgm` (Arabic, model numbers).

### 2.4 File structure
```
/
├─ data/                       original workbook (never modified)
├─ docs/                       architecture, database, api, auth, 3d, page-builder, importer, deployment, backup
├─ prisma/  schema.prisma, migrations/, seed/
├─ public/  demo-models/ (demo GLB), brand/
├─ src/
│  ├─ app/
│  │  ├─ [locale]/(public)/    home, marketplace, categories, products/[slug], products/[slug]/3d,
│  │  │                        new, used, suppliers, institutions, quote, sell, favorites, about,
│  │  │                        contact, terms, privacy, notifications
│  │  ├─ [locale]/(auth)/      login, register
│  │  ├─ [locale]/dashboard/   student/, seller/, institution/
│  │  ├─ [locale]/admin/       overview, products, categories, suppliers, users, institutions, orders,
│  │  │                        quotations, inventory, images, assets-3d, import, customize,
│  │  │                        page-builder, analytics, reports, notifications, security, settings
│  │  ├─ api/                  uploads, import, 3d assets (route handlers where server actions don't fit)
│  │  ├─ sitemap.ts, robots.ts
│  ├─ components/  ui/ (shadcn), layout/, marketplace/, product/, viewer3d/, builder/, admin/, motion/
│  ├─ features/    <domain>/{actions.ts, queries.ts, schema.ts, service.ts}  (products, catalog, auth,
│  │               quotations, orders, messaging, import, assets3d, content, inventory, …)
│  ├─ lib/         db, auth, rbac, storage/, email/, payments/, rate-limit, audit, i18n, seo, money
│  ├─ i18n/        messages/ar.json, messages/en.json, routing
│  └─ styles/      tokens.css (design tokens → CSS variables, overridable from ThemeSettings)
├─ tests/ unit/, integration/, e2e/
├─ README.md  .env.example  DEVELOPMENT_PLAN.md  DEVELOPMENT_STATUS.md
```

### 2.5 3D viewer design (`InteractiveEquipmentViewer`)
- Lazy-loaded client component (`next/dynamic`, `ssr:false`); WebGL detection → image-gallery fallback.
- Config = `{ modelUrl, camera presets, components[] { meshName, nameAr/En, function, specs, parentId,
  explodeVector, order, imageUrl } , animation { duration, easing } }` loaded from DB.
- OrbitControls (rotate/zoom/pan), preset views (front/rear/top/side/iso) with tweened camera,
  fullscreen API, reset.
- Exploded view: per-mesh target = origin + vector × distance slider; GSAP timeline (play / pause /
  resume / reverse = reassemble / speed control); staggered by hierarchy depth.
- Raycast selection → outline highlight + camera focus + info panel (bilingual) + tree path.
- Component tree with show / hide / isolate / show-all.
- Admin 3D editor: upload GLB → server validation (gltf-transform: size, triangle count, textures) →
  auto-list meshes → assign names/hierarchy/vectors with live preview → save draft → verify → publish;
  version list with restore.

---

## 3. Roadmap (each phase ends with tests + DEVELOPMENT_STATUS.md update + runnable app)

| # | Phase | Deliverable / exit test |
|---|---|---|
| 1 | Inspection | ✅ done (this document) |
| 2 | Scaffold + design system + i18n | Next.js app, tokens, typography (IBM Plex Sans Arabic + Inter), shadcn components, header/footer, language switch keeping path, RTL verified by Playwright screenshots |
| 3 | Database + auth + RBAC | Prisma schema & migrations, seed (categories, roles, admin, labelled demo data), register/login/logout, sessions, role guards, rate limiting, audit log |
| 4 | Marketplace | Home (sections from DB), marketplace with filters/sort/search/pagination, category pages, product detail, new/used pages, favorites, SEO (metadata, JSON-LD, sitemap, robots, canonical, hreflang) |
| 5 | Excel importer | Upload → inspect → preview → photo extraction → mapping grid (correctable) → categories → validation → confirm → import → report + error CSV; idempotent re-import |
| 6 | 3D experience | Viewer, controls, exploded view, selection, tree, visibility, info panel; original demo model (labelled); 3D asset manager with upload/validate/versions/publish |
| 7 | Admin dashboard | KPIs + all 17 modules with real CRUD, destructive-action confirmation |
| 8 | Visual editor | Website customization (brand, theme, content, navigation, animations), drag-and-drop page builder, undo/redo, device preview, autosave drafts, publish, version history/compare/restore |
| 9 | Business features | Seller listings & approval, RFQ + supplier offers + compare/accept, messaging, notifications (+email adapter), manual orders with status history, seller/institution/student dashboards |
| 10 | Hardening + delivery | Full test pass (unit/integration/E2E ×3 viewports ×2 locales), typecheck, lint, security review, performance (Lighthouse), docs, deployment guide |

Estimated size: this is several working sessions. Progress is tracked in `DEVELOPMENT_STATUS.md`;
every phase is committed and pushed to `claude/zen-sagan-wzyp0k`.

---

## 4. Open questions for the owner
1. **Hosting target** — Vercel + managed Postgres (Neon/Supabase), or a VPS/Docker in Oman/GCC?
2. **File storage** — Cloudinary (images) + S3/R2 (3D, documents), or one S3-compatible bucket for all?
3. **Seller of the 82 inventory items** — which organization name should own these listings?
4. **Item 26 vs 82 (BGC-8088)** — merge into one product (qty 4) or keep separate?
5. **Indicative replacement prices** — visible to buyers (clearly labelled) or admin-only?
6. **Email provider** (SMTP / Resend) and domain — can be added later; console adapter until then.

---

## 5. Owner decisions (2026-11-08)
1. **Initial import = clear items only.** `data/photo-mapping.json` classifies all 82 rows:
   - `CLEAR` — 56 items / 416 units: photo visually confirmed for that item → imported and publishable.
   - `NEEDS_REVIEW` — 23 items: photo plausible but not confirmed → **not published**; kept in the
     importer's review queue so the owner can confirm and add them later with one action.
   - `NO_PHOTO` — 3 items (1 ultrasonic cleaner, 63 W&G noise system, 79 FEEDBACK modules) → not published.
   - Confirmed shift: Photos 1–39 → Items 2–40; Photos 40/41 (duplicate) → Item 41; 42–62 aligned;
     Photos 63–75 → Items 64–76; Photos 76/77 (duplicate) → Item 77; 78–82 aligned (79 mismatched).
2. **Add more equipment later** — admin "Add product" form (bilingual, photos, category, condition,
   specs) plus promoting `NEEDS_REVIEW` rows from the import queue.
3. **Prices editable after verification** — imported items get **no selling price** (public shows
   "Price on request / السعر عند الطلب"). The indicative replacement price is stored as an internal
   reference. Admin sets/edits the actual selling price per product; every change is audit-logged.
4. **Store quantity** — initial stock = workbook quantity (as an `InventoryTransaction` of type
   `IMPORT`); admin edits stock in the product form or Inventory module (adjustments recorded in the
   ledger). Public shows "In stock: N" / "Out of stock".
