# Deploy Comments - Pending Changes Log

Lightweight, in-repo record of incremental changes accumulated since the last src/deploy-version bump. Updated every session (see Session Runbook -> End of Session, step 3). When the pending list below represents a complete batch (roughly 2-3 requirements), consolidate it into one new src/deploy-version line and reset this section.

Tracking starts at Session 24 - everything before this point lives in the Session Logs database and the Migration & Build Log's Recently Closed archive, not duplicated here.

## Pending (since v1.0.12)

- Session 30: Buyer-entitlement gate + signed-URL delivery for Blob-backed media — gate /reader/$productId on purchase (redirect non-buyers to /product/$productId), new /api/media/$productId route streams private Blob media only after a hasPurchased() check, MediaPlayer.tsx routes real uploads through the gated endpoint (sample fallback unchanged). Range/206 not implemented (flagged v1 gap); buyer happy-path (real purchase + real Blob upload) not yet live-tested due to empty dev data.
