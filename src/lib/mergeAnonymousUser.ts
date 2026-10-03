import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import {
  cartItems,
  cartState,
  wallet,
  loyaltyLedger,
  downloads,
  refundClaims,
  affiliateReferrals,
  affiliateProfiles,
  mediaProgress,
  challengeProgress,
  challengeSettings,
  challengeReviews,
  notifyRequests,
} from "~/db/schema";

/**
 * Migrates an anonymous visitor's data onto the real account they just
 * signed up / signed in as, via `anonymous()`'s `onLinkAccount` hook (see
 * src/lib/auth.ts). Better Auth deletes the anonymous user row right after
 * this hook resolves, and every table below has an `onDelete: "cascade"`
 * FK to `user.id` (src/db/schema.ts) — so any row we do NOT explicitly
 * reassign to `realUserId` is deleted automatically along with the
 * anonymous user. That cascade is what implements "discard the anonymous
 * row" for the conflict cases below: we simply don't touch those rows, and
 * they disappear on their own. `mediaProgress`, `challengeProgress`,
 * `challengeReviews` and `notifyRequests` are composite-key tables (userId plus a second column),
 * so their conflict checks are done per-row rather than once per user.
 * `challengeSettings` is one row per user, like `cartState`.
 *
 * Manual verification (no automated test harness for this yet):
 * 1. Load the site with no session — the anonymous plugin signs you in
 *    (src/components/AnonymousAuthBoot.tsx). Add a cart item and load the
 *    wallet page so a wallet row seeds with default credits.
 * 2. Sign up with an email that has NO existing account. Confirm the cart
 *    item and wallet credits both survive under the new account (simple
 *    reassignment path — no pre-existing rows to conflict with).
 * 3. Repeat from a fresh anonymous session, but this time sign up with an
 *    email that DOES already have an account with its own cart item and
 *    wallet balance. Confirm: the pre-existing account's cart item is
 *    unchanged (not duplicated), and its wallet credits increased by
 *    exactly the anonymous session's credits (sum, not overwrite).
 */
function db() {
  return drizzle(sql());
}

function addDecimalStrings(a: string, b: string): string {
  return (parseFloat(a) + parseFloat(b)).toFixed(2);
}

export async function mergeAnonymousUserData(
  anonUserId: string,
  realUserId: string,
): Promise<void> {
  const database = db();

  try {
    // Reads that decide the branching below for the one-row-per-user
    // tables (cartState, wallet, challengeSettings) and the composite-key
    // tables (mediaProgress, challengeProgress, challengeReviews, notifyRequests). These run ahead of the atomic write batch — the
    // neon-http driver has no interactive/read-then-write transaction
    // support (see the comment on `database.batch(...)` below), so this
    // read-then-decide step isn't itself covered by the same atomicity
    // guarantee as the writes. Acceptable here: a given anonymous session
    // only ever goes through account-linking once.
    const [
      anonCartStateRows,
      realCartStateRows,
      anonWalletRows,
      realWalletRows,
      anonReferralRows,
      realReferralRows,
      anonAffiliateProfileRows,
      realAffiliateProfileRows,
      anonMediaProgressRows,
      realMediaProgressRows,
      anonChallengeProgressRows,
      realChallengeProgressRows,
      anonChallengeSettingsRows,
      realChallengeSettingsRows,
      anonChallengeReviewRows,
      realChallengeReviewRows,
      anonNotifyRows,
      realNotifyRows,
    ] = await Promise.all([
        database.select().from(cartState).where(eq(cartState.userId, anonUserId)),
        database.select().from(cartState).where(eq(cartState.userId, realUserId)),
        database.select().from(wallet).where(eq(wallet.userId, anonUserId)),
        database.select().from(wallet).where(eq(wallet.userId, realUserId)),
        database.select().from(affiliateReferrals).where(eq(affiliateReferrals.userId, anonUserId)),
        database.select().from(affiliateReferrals).where(eq(affiliateReferrals.userId, realUserId)),
        database.select().from(affiliateProfiles).where(eq(affiliateProfiles.userId, anonUserId)),
        database.select().from(affiliateProfiles).where(eq(affiliateProfiles.userId, realUserId)),
        database.select().from(mediaProgress).where(eq(mediaProgress.userId, anonUserId)),
        database.select().from(mediaProgress).where(eq(mediaProgress.userId, realUserId)),
        database.select().from(challengeProgress).where(eq(challengeProgress.userId, anonUserId)),
        database.select().from(challengeProgress).where(eq(challengeProgress.userId, realUserId)),
        database.select().from(challengeSettings).where(eq(challengeSettings.userId, anonUserId)),
        database.select().from(challengeSettings).where(eq(challengeSettings.userId, realUserId)),
        database.select().from(challengeReviews).where(eq(challengeReviews.userId, anonUserId)),
        database.select().from(challengeReviews).where(eq(challengeReviews.userId, realUserId)),
        database.select().from(notifyRequests).where(eq(notifyRequests.userId, anonUserId)),
        database.select().from(notifyRequests).where(eq(notifyRequests.userId, realUserId)),
      ]);

    const conditionalOps: (ReturnType<typeof database.update> | ReturnType<typeof database.delete>)[] = [];

    // cartState: userId is the primary key, one row per user. If the real
    // user already has a row, keep it as-is and let the anonymous row
    // cascade-delete with the anonymous user — merging abandoned-cart
    // timestamps/flags across two carts isn't meaningful data to preserve.
    // Only reassign the anonymous row when the real user has none yet.
    if (anonCartStateRows.length > 0 && realCartStateRows.length === 0) {
      conditionalOps.push(
        database.update(cartState).set({ userId: realUserId }).where(eq(cartState.userId, anonUserId)),
      );
    }

    // wallet: userId is the primary key, one row per user, holding real
    // credit balances — unlike cartState this DOES need a merge, since
    // dropping the anonymous row would silently destroy credits the
    // visitor already holds. Sum the balance/usage counters into the real
    // row; refillPrice and costPer1K are pricing config, not per-user
    // balances, so they're left untouched on the real row rather than
    // averaged or overwritten.
    const anonWalletRow = anonWalletRows[0];
    const realWalletRow = realWalletRows[0];
    if (anonWalletRow && realWalletRow) {
      conditionalOps.push(
        database
          .update(wallet)
          .set({
            credits: addDecimalStrings(anonWalletRow.credits, realWalletRow.credits),
            totalPurchased: addDecimalStrings(anonWalletRow.totalPurchased, realWalletRow.totalPurchased),
            totalConsumed: addDecimalStrings(anonWalletRow.totalConsumed, realWalletRow.totalConsumed),
          })
          .where(eq(wallet.userId, realUserId)),
      );
    } else if (anonWalletRow && !realWalletRow) {
      conditionalOps.push(
        database.update(wallet).set({ userId: realUserId }).where(eq(wallet.userId, anonUserId)),
      );
    }

    // affiliateReferrals: userId is the primary key, one row per visitor.
    // Last-click-wins is this table's own semantics (see
    // affiliateProgram.ts's captureReferral), so a merge conflict is
    // resolved the same way: whichever row has the later referredAt wins.
    // If the real user has no row yet, this is a plain reassign. If the
    // anonymous row is newer, delete the real user's stale row and reassign
    // the anonymous row; if the real row is newer or equal, leave both
    // alone and let the anonymous row cascade away untouched.
    const anonReferralRow = anonReferralRows[0];
    const realReferralRow = realReferralRows[0];
    if (anonReferralRow && !realReferralRow) {
      conditionalOps.push(
        database
          .update(affiliateReferrals)
          .set({ userId: realUserId })
          .where(eq(affiliateReferrals.userId, anonUserId)),
      );
    } else if (
      anonReferralRow &&
      realReferralRow &&
      anonReferralRow.referredAt.getTime() > realReferralRow.referredAt.getTime()
    ) {
      conditionalOps.push(
        database.delete(affiliateReferrals).where(eq(affiliateReferrals.userId, realUserId)),
      );
      conditionalOps.push(
        database
          .update(affiliateReferrals)
          .set({ userId: realUserId })
          .where(eq(affiliateReferrals.userId, anonUserId)),
      );
    }

    // affiliateProfiles: userId is unique, at most one affiliate profile per
    // user. If only the anonymous session registered as an affiliate,
    // reassign it. If both already have their own profile, leave both alone
    // (the anonymous one cascades away) — a rare edge case, not worth
    // conflict-merging.
    if (anonAffiliateProfileRows.length > 0 && realAffiliateProfileRows.length === 0) {
      conditionalOps.push(
        database
          .update(affiliateProfiles)
          .set({ userId: realUserId })
          .where(eq(affiliateProfiles.userId, anonUserId)),
      );
    }

    // mediaProgress: composite primary key (userId, productId) — reassign
    // per product; where the real user already has a saved position for
    // that same product, leave the anonymous row alone so it cascades away
    // instead of attempting to merge two playback positions (the real
    // account's position wins).
    const realMediaProductIds = new Set(realMediaProgressRows.map((row) => row.productId));
    for (const row of anonMediaProgressRows) {
      if (!realMediaProductIds.has(row.productId)) {
        conditionalOps.push(
          database
            .update(mediaProgress)
            .set({ userId: realUserId })
            .where(and(eq(mediaProgress.userId, anonUserId), eq(mediaProgress.productId, row.productId))),
        );
      }
    }

    // challengeProgress: composite primary key (userId, productId) — same
    // per-product handling as mediaProgress. Reassign each anonymous row only
    // when the real user has no challenge progress for that product; where
    // both have one, the anonymous row is left alone to cascade-delete and
    // the real account's progress wins.
    const realChallengeProgressProductIds = new Set(
      realChallengeProgressRows.map((row) => row.productId),
    );
    for (const row of anonChallengeProgressRows) {
      if (!realChallengeProgressProductIds.has(row.productId)) {
        conditionalOps.push(
          database
            .update(challengeProgress)
            .set({ userId: realUserId })
            .where(
              and(
                eq(challengeProgress.userId, anonUserId),
                eq(challengeProgress.productId, row.productId),
              ),
            ),
        );
      }
    }

    // notifyRequests: composite primary key (userId, productId) — same
    // per-product handling as challengeProgress. Reassign each anonymous row
    // only when the real user has no request for that product; where both
    // have one, the anonymous row is left alone to cascade-delete.
    const realNotifyProductIds = new Set(realNotifyRows.map((row) => row.productId));
    for (const row of anonNotifyRows) {
      if (!realNotifyProductIds.has(row.productId)) {
        conditionalOps.push(
          database
            .update(notifyRequests)
            .set({ userId: realUserId })
            .where(
              and(
                eq(notifyRequests.userId, anonUserId),
                eq(notifyRequests.productId, row.productId),
              ),
            ),
        );
      }
    }

    // challengeSettings: userId is the primary key, one row per user (pacing
    // config plus reminder interval) — same handling as cartState. Reassign
    // the anonymous row only when the real user has none yet; otherwise the
    // real account's settings win and the anonymous row cascade-deletes.
    if (anonChallengeSettingsRows.length > 0 && realChallengeSettingsRows.length === 0) {
      conditionalOps.push(
        database
          .update(challengeSettings)
          .set({ userId: realUserId })
          .where(eq(challengeSettings.userId, anonUserId)),
      );
    }

    // challengeReviews: one review per (userId, productId), enforced by a
    // unique constraint — so reassigning a row the real user already has a
    // review for would fail the whole batch. Reassign per product only when
    // the real user has no review for it; where both reviewed the same
    // product, the real account's review wins and the anonymous row
    // cascade-deletes.
    const realChallengeReviewProductIds = new Set(
      realChallengeReviewRows.map((row) => row.productId),
    );
    for (const row of anonChallengeReviewRows) {
      if (!realChallengeReviewProductIds.has(row.productId)) {
        conditionalOps.push(
          database
            .update(challengeReviews)
            .set({ userId: realUserId })
            .where(
              and(
                eq(challengeReviews.userId, anonUserId),
                eq(challengeReviews.productId, row.productId),
              ),
            ),
        );
      }
    }

    const ops = [
      // cartItems, loyaltyLedger, downloads, refundClaims: no conflict
      // handling needed — each row has its own id, so reassigning is a
      // plain move regardless of what the real user already has.
      database.update(cartItems).set({ userId: realUserId }).where(eq(cartItems.userId, anonUserId)),
      database.update(loyaltyLedger).set({ userId: realUserId }).where(eq(loyaltyLedger.userId, anonUserId)),
      database.update(downloads).set({ userId: realUserId }).where(eq(downloads.userId, anonUserId)),
      database.update(refundClaims).set({ userId: realUserId }).where(eq(refundClaims.userId, anonUserId)),
      ...conditionalOps,
    ];

    // neon-http has no `db.transaction()` — it throws "No transactions
    // support in neon-http driver". `db.batch()` is this driver's atomic
    // alternative: Neon runs the whole array as one real Postgres
    // transaction over HTTP, all-or-nothing. That's what guarantees a
    // partial failure here doesn't leave some tables merged and others
    // not. The cast below is just working around `.batch()`'s
    // non-empty-tuple type signature for a dynamically-built array — `ops`
    // always has at least 4 elements (the unconditional updates above).
    await database.batch(ops as unknown as [(typeof ops)[number], ...(typeof ops)[number][]]);
  } catch (error) {
    console.error(
      `[mergeAnonymousUserData] Merge failed for anonymous user ${anonUserId} -> real user ${realUserId}. ` +
        "Better Auth will still delete the anonymous user row after this hook returns, so any data that " +
        "didn't make it into this batch needs manual recovery. Error:",
      error,
    );
    throw error;
  }
}
