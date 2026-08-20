# Deploy Comments - Pending Changes Log

Lightweight, in-repo record of incremental changes accumulated since the last src/deploy-version bump. Updated every session (see Session Runbook -> End of Session, step 3). When the pending list below represents a complete batch (roughly 2-3 requirements), consolidate it into one new src/deploy-version line and reset this section.

Tracking starts at Session 24 - everything before this point lives in the Session Logs database and the Migration & Build Log's Recently Closed archive, not duplicated here.

## Pending (since v1.0.10)

- Session 23: Catalog storefront read migration, Tier A - ProgressHub.tsx, AnalyticsDashboard.tsx, CrossSellGrid.tsx, CheckoutUpsells.tsx migrated off localStorage onto Neon-backed queries; new updateCatalogAccess server function fixes a write-path bug that was bypassing Neon.
- Session 24: Catalog storefront read migration, Tier B - products.ts's getAllProducts() and its 6-file call graph (ComingSoonSection.tsx, SpotlightLayout.tsx, ProductGrid.tsx, product.$productId.tsx, reader.$productId.tsx) migrated off localStorage; fixed a Rules-of-Hooks bug in ComingSoonSection.tsx; removed a redundant getAllProducts() call inside ProductGrid's ProductCard. Flagged, not fixed: the 2-second poll on the homepage grid now hits Neon on every tick - tracked separately as its own Migration Task Checklist item ("Catalog polling: replace full-refetch with a cheap change-signal").
