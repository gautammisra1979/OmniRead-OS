/**
 * Feature-tier gating (Step 26 trust-boundary decision).
 *
 * Self-hosted buyers run their own copy of this app against their own
 * database, so a client-side cryptographic license check can never stop
 * someone who controls the machine it runs on — it only adds attack
 * surface without a real security payoff. Tier is now a single
 * admin-managed Postgres row (like promoSettings), not a signed token.
 * The admin-auth override below is a convenience for the store owner
 * managing their own instance, not a security boundary.
 */

import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { licenseSettings } from "~/db/schema";
import { requireAdmin } from "~/lib/requireAdmin";

export type LicenseTier = "standard" | "premium";

const LICENSE_SETTINGS_ID = "global";
const DEFAULT_TIER: LicenseTier = "standard";

function db() {
  return drizzle(sql());
}

/* ─── Internal server functions ─── */

const dbGetLicenseTier = createServerFn({ method: "GET" }).handler(
  async (): Promise<LicenseTier> => {
    const database = db();
    const rows = await database
      .select()
      .from(licenseSettings)
      .where(eq(licenseSettings.id, LICENSE_SETTINGS_ID));
    if (rows[0]) return rows[0].tier as LicenseTier;

    await database
      .insert(licenseSettings)
      .values({ id: LICENSE_SETTINGS_ID, tier: DEFAULT_TIER })
      .onConflictDoNothing();
    return DEFAULT_TIER;
  },
);

const dbSetLicenseTier = createServerFn({ method: "POST" })
  .validator((tier: LicenseTier) => tier)
  .handler(async ({ data: tier }): Promise<void> => {
    await requireAdmin();
    await db()
      .insert(licenseSettings)
      .values({ id: LICENSE_SETTINGS_ID, tier })
      .onConflictDoUpdate({
        target: licenseSettings.id,
        set: { tier },
      });
  });

/* ─── Public API: tier settings ─── */

export async function getLicenseTier(): Promise<LicenseTier> {
  return dbGetLicenseTier();
}

export async function setLicenseTier(tier: LicenseTier): Promise<void> {
  return dbSetLicenseTier({ data: tier });
}

/* ─── Feature Gating ─── */

const PREMIUM_FEATURES = [
  "quiz",
  "challenge",
  "progress",
  "affiliate",
  "downloads",
  "product-media",
  "all",
] as const;

export type PremiumFeature = (typeof PREMIUM_FEATURES)[number];

export function isPremiumFeature(feature: string): boolean {
  return PREMIUM_FEATURES.includes(feature as PremiumFeature);
}

function hasAdminOverride(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem("omnimeda_admin_auth") === "true";
  } catch {
    return false;
  }
}

/**
 * Check if a specific premium feature is unlocked. All premium features
 * gate on the same global tier setting — there is no per-feature license,
 * so `feature` is accepted for call-site compatibility but doesn't change
 * the result.
 */
export async function isFeatureUnlocked(_feature: string): Promise<boolean> {
  if (hasAdminOverride()) return true;
  const tier = await getLicenseTier();
  return tier === "premium";
}

/**
 * Get all currently unlocked premium features.
 */
export async function getUnlockedFeatures(): Promise<string[]> {
  const unlocked = await isFeatureUnlocked("all");
  return unlocked ? [...PREMIUM_FEATURES] : [];
}
