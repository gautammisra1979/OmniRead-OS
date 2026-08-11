import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { hashPassword } from "better-auth/crypto";
import { sql } from "~/db";
import { user, account } from "~/db/auth-schema";
import { auth, ADMIN_CLAIM_TOKEN_HEADER } from "~/lib/auth";

/**
 * Server-side handler backing src/routes/admin_.claim.tsx — kept in its own
 * plain module (rather than inline in the route file) so importing it from
 * the route component doesn't drag `~/lib/auth` (Neon/drizzle-adapter, env
 * var reads) into the client bundle. Mirrors src/data/cart.ts, wallet.ts,
 * etc: a createServerFn defined in a non-route .ts file, called from a
 * route component.
 *
 * Supports two cases, both gated the same way (token + reserved email):
 *  - The reserved email has no account yet: creates one via Better Auth's
 *    normal signUpEmail, which re-validates the token server-side through
 *    databaseHooks.user.create.before (src/lib/auth.ts).
 *  - The reserved email already has an account (owner locked out): resets
 *    its password directly instead of routing through Better Auth's
 *    email-based forgot-password flow. This project has no outbound email
 *    delivery wired up, so requestPasswordReset()'s normal path (mail a
 *    token, wait for the click) has nothing to send through. The claim
 *    token already proves ownership at least as strongly as a mailed reset
 *    link would, so there's nothing a real email round trip would add
 *    here. The reset below mirrors exactly what Better Auth's own
 *    POST /reset-password handler does internally (see
 *    node_modules/better-auth/dist/api/routes/password.mjs) — same
 *    hashPassword() call, same credential-account upsert shape — just
 *    invoked directly under our own token check instead of a mailed one.
 */

function isReservedAdminEmail(email: string): boolean {
  const normalized = email.toLowerCase();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminEmailBackup = process.env.ADMIN_EMAIL_BACKUP?.toLowerCase();
  return (!!adminEmail && normalized === adminEmail) || (!!adminEmailBackup && normalized === adminEmailBackup);
}

const dbClaimAdminAccount = createServerFn({ method: "POST" })
  .validator((input: { email: string; password: string; token: string }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const adminClaimToken = process.env.ADMIN_CLAIM_TOKEN;
    const normalizedEmail = data.email.trim().toLowerCase();

    // Generic failure only — never reveal which check failed to the caller.
    if (!adminClaimToken || data.token !== adminClaimToken || !isReservedAdminEmail(normalizedEmail)) {
      return { ok: false };
    }

    try {
      const database = drizzle(sql());
      const existingUsers = await database.select().from(user).where(eq(user.email, normalizedEmail));

      if (existingUsers.length === 0) {
        // Fresh claim: go through Better Auth's normal sign-up path so it
        // re-checks the token via databaseHooks (the token travels as a
        // header, not a body field — see ADMIN_CLAIM_TOKEN_HEADER in
        // src/lib/auth.ts for why) and produces a normal Better-Auth-hashed
        // credential account.
        await auth.api.signUpEmail({
          body: { email: normalizedEmail, password: data.password, name: "Admin" },
          headers: new Headers({ [ADMIN_CLAIM_TOKEN_HEADER]: data.token }),
        });
        return { ok: true };
      }

      // Lockout recovery: directly reset the existing account's password.
      const userId = existingUsers[0].id;
      const hashed = await hashPassword(data.password);
      const existingAccounts = await database
        .select()
        .from(account)
        .where(and(eq(account.userId, userId), eq(account.providerId, "credential")));

      if (existingAccounts.length > 0) {
        await database.update(account).set({ password: hashed }).where(eq(account.id, existingAccounts[0].id));
      } else {
        await database.insert(account).values({
          id: crypto.randomUUID(),
          accountId: userId,
          providerId: "credential",
          userId,
          password: hashed,
        });
      }

      await auth.api.signInEmail({ body: { email: normalizedEmail, password: data.password } });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });

export async function claimAdminAccount(input: {
  email: string;
  password: string;
  token: string;
}): Promise<{ ok: boolean }> {
  return dbClaimAdminAccount({ data: input });
}
