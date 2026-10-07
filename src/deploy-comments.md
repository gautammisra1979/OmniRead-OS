# Deploy Comments - Pending Changes Log

Lightweight, in-repo record of incremental changes accumulated since the last src/deploy-version bump. Updated every session (see Session Runbook -> End of Session, step 3). When the pending list below represents a complete batch (roughly 2-3 requirements), consolidate it into one new src/deploy-version line and reset this section.

Tracking starts at Session 24 - everything before this point lives in the Session Logs database and the Migration \& Build Log's Recently Closed archive, not duplicated here.

## Pending (since v1.0.13)

* Session 80: Bumped deploy-version to v1.0.13 (consolidates the Sessions 29-79 pending list) as the first Production deploy after the Infra & Migration cutover; no code changes.
* Session 81: Storage interface part A - provider-neutral src/lib/storage (STORAGE_PROVIDER, Vercel Blob adapter, presigned media upload at /api/storage/media-upload); Postgres now stores keys (cover_key/media_key/logo_key, migration 0029 converts URLs); CSV import no longer writes file URLs; CSP connect-src now comes from the storage adapter (allows the Vercel Blob upload endpoint); failed publishes discard their uploaded files; needs STORAGE_PUBLIC_BASE_URL env var before deploy.
