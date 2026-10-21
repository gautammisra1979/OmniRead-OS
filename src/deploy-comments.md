# Deploy Comments - Pending Changes Log

Lightweight, in-repo record of incremental changes accumulated since the last src/deploy-version bump. Updated every session (see Session Runbook -> End of Session, step 3). When the pending list below represents a complete batch (roughly 2-3 requirements), consolidate it into one new src/deploy-version line and reset this section.

Tracking starts at Session 24 - everything before this point lives in the Session Logs database and the Migration \& Build Log's Recently Closed archive, not duplicated here.

## Pending (since v1.0.14)

* Session 88: Bumped deploy-version to v1.0.14 (consolidates the Sessions 81-86 pending list) after applying migrations 0029-0031 to the Neon production branch; no code changes.
* Session 89: Removed timer-based polling (catalog change-signal checked on load and tab visibility; StorageConsole refresh button; one-shot abandoned-cart check at the 30-minute mark); storage.refresh added in en/fr/es.
* Session 96: cf-spike branch only (throwaway, not for merge) - Cloudflare Workers hello-world build: @cloudflare/vite-plugin replaces the Nitro Vercel preset in vite.config.ts, wrangler.jsonc added, preview/deploy scripts, .dev.vars and .wrangler ignored.
