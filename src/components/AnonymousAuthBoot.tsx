import { useEffect } from "react";
import { authClient } from "~/lib/auth-client";

/**
 * Ensures every visitor — guest or logged-in — has a real Better Auth
 * session from first page load, via the `anonymous` plugin (see
 * src/lib/auth.ts). Fires sign-in only when there's no active session yet,
 * so it's a no-op on subsequent loads. Renders nothing and never blocks
 * rendering — cart/wallet/loyalty server functions fetch the session
 * themselves once it exists (see src/lib/getUserId.ts).
 */
export function AnonymousAuthBoot() {
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending || session) return;
    authClient.signIn.anonymous();
  }, [isPending, session]);

  return null;
}
