import { createServerFn } from "@tanstack/react-start";
import { requireAdmin } from "~/lib/requireAdmin";

/**
 * Client-callable version of requireAdmin()'s check, for the admin
 * dashboard's initial gate (src/routes/admin.tsx) — the client can't read
 * `process.env` itself, so it asks the server. This is a convenience for
 * deciding what to render; it grants nothing on its own, since every
 * admin-mutating server function still calls requireAdmin() independently.
 *
 * Kept in its own file (rather than alongside requireAdmin() itself) so
 * that importing it from a client component doesn't pull requireAdmin.ts's
 * server-only `getRequestHeaders` import into the client bundle — mirrors
 * how src/lib/getUserId.ts is kept separate from the createServerFn
 * wrappers that call it (see src/data/cart.ts, src/data/wallet.ts).
 */
export const checkIsAdmin = createServerFn({ method: "GET" }).handler(async (): Promise<boolean> => {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
});
