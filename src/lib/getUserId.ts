import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "~/lib/auth";

/**
 * Every visitor — guest or logged-in — has a real Better Auth session by the
 * time a server function runs, via the `anonymous` plugin's client-side
 * bootstrap (see src/routes/__root.tsx). A missing session here means that
 * bootstrap hasn't run yet, which shouldn't happen for a server function
 * invoked from the client.
 *
 * Only call from inside a server function handler (createServerFn), since it
 * relies on TanStack Start's request-scoped header context — same
 * constraint the old getOrCreateOwnerId() had.
 */
export async function getUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) throw new Error("No session — anonymous sign-in should have run on app load");
  return session.user.id;
}
