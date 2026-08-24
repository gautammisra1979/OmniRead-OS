import { useEffect } from "react";
import { captureReferral } from "~/data/affiliateProgram";

/**
 * One-shot: reads `?ref=<handle>` off the incoming URL and, if present,
 * captures it as this visitor's active referral (server-side, keyed to
 * their Better Auth user_id — see src/data/affiliateProgram.ts). Renders
 * nothing. This app has no root-level useSearch-based search-param reading
 * to extend, so a direct URLSearchParams read is correct here, not an
 * inconsistency. captureReferral()'s own getUserId() call resolves once
 * Better Auth's anonymous sign-in (AnonymousAuthBoot) has run, whenever
 * that happens to land — no ordering dependency needed between the two.
 */
export function AffiliateReferralBoot() {
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) captureReferral(ref);
  }, []);

  return null;
}
