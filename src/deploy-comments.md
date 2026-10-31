# Deploy Comments - Pending Changes Log

Lightweight, in-repo record of incremental changes accumulated since the last src/deploy-version bump. Updated every session (see Session Runbook -> End of Session, step 3). When the pending list below represents a complete batch (roughly 2-3 requirements), consolidate it into one new src/deploy-version line and reset this section.

Tracking starts at Session 24 - everything before this point lives in the Session Logs database and the Migration \& Build Log's Recently Closed archive, not duplicated here.

## Pending (since v1.0.14)

* Session 88: Bumped deploy-version to v1.0.14 (consolidates the Sessions 81-86 pending list) after applying migrations 0029-0031 to the Neon production branch; no code changes.
* Session 89: Removed timer-based polling (catalog change-signal checked on load and tab visibility; StorageConsole refresh button; one-shot abandoned-cart check at the 30-minute mark); storage.refresh added in en/fr/es.
* Session 100: Upgraded TanStack Start to the 1.0 stable line (@tanstack/react-start 1.169.4, @tanstack/react-router 1.170.46) and Vite 7 to 8.3.5; no source changes (code already on .validator()); Nitro nightly and other build plugins unchanged.
* Session 101: Host-neutral APP_ENV flag replaces VERCEL_ENV guards (background email sends only when APP_ENV=production; unverified email providers selectable only on development/preview; both fail safe when unset); client-IP header configurable via CLIENT_IP_HEADER (default x-forwarded-for) for the app rate limiter and Better Auth.
* Session 102: 16b S3-API storage adapter (STORAGE_PROVIDER=r2, aws4fetch) with public covers/logos bucket and private media bucket; presigned browser PUT for media on r2; Vercel Blob path unchanged.
* Session 103: 16c Cloudflare Workers hosting on dev (Cloudflare Vite plugin replaces Nitro; wrangler.jsonc top-level = dev worker omniread-dev, env.production = omniread-prod stub until 16d; deploy:dev script); CSP img/media fallback is 'self' when STORAGE_PROVIDER=r2; .dev.vars and .wrangler/ gitignored; Vercel builds stopped.
