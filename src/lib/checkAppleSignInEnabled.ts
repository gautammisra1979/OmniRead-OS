import { createServerFn } from "@tanstack/react-start";
import { appleConfigured } from "~/lib/auth";

/**
 * Client-callable read of whether Sign in with Apple is configured — the
 * client can't read `process.env` itself, so it asks the server. Mirrors
 * src/lib/checkIsAdmin.ts's shape: kept in its own file so importing it from
 * AdminLogin.tsx doesn't pull auth.ts's server-only db/drizzle imports into
 * the client bundle.
 */
export const checkAppleSignInEnabled = createServerFn({ method: "GET" }).handler(
  async (): Promise<boolean> => appleConfigured,
);
