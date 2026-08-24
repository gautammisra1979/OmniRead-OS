# Deploy Comments - Pending Changes Log

Lightweight, in-repo record of incremental changes accumulated since the last src/deploy-version bump. Updated every session (see Session Runbook -> End of Session, step 3). When the pending list below represents a complete batch (roughly 2-3 requirements), consolidate it into one new src/deploy-version line and reset this section.

Tracking starts at Session 24 - everything before this point lives in the Session Logs database and the Migration \& Build Log's Recently Closed archive, not duplicated here.

## Pending (since v1.0.11)

\- Session 28: Affiliate module Tier A — Postgres backend (6 tables: affiliate\_profiles, affiliate\_referrals, affiliate\_click\_events, affiliate\_ledger, affiliate\_payouts, affiliate\_settings), referral capture boot hook, commission-crediting + refund-voiding hooks wired into checkout, dbMarkDownloadsRefunded ownerId-scoping fix

