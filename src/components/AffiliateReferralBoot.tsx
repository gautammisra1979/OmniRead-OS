import { useEffect } from "react";
import { captureReferral, recordAffiliateClick } from "~/data/affiliateProgram";

/**
 * One-shot: reads `?ref=<handle>` off the incoming URL and, if present,
 * captures it as this visitor's active referral (server-side, keyed to
 * their Better Auth user_id — see src/data/affiliateProgram.ts) and records
 * a click event. Renders nothing. This app has no root-level
 * useSearch-based search-param reading to extend, so a direct
 * URLSearchParams read is correct here, not an inconsistency. Both calls
 * resolve once Better Auth's anonymous sign-in (AnonymousAuthBoot) has run,
 * whenever that happens to land — no ordering dependency needed. Both
 * already no-op safely if the handle doesn't resolve to a real affiliate,
 * so no conditional logic is needed between them.
 */
export function AffiliateReferralBoot() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref) return;
    captureReferral(ref);
    recordAffiliateClick(ref, window.location.pathname);
  }, []);

  return null;
}
