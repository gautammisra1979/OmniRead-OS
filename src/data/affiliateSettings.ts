import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { affiliateSettings, type AffiliateSettingsRow } from "~/db/schema";
import { requireAdmin } from "~/lib/requireAdmin";

/**
 * Single global, admin-managed affiliate program settings row — same
 * pattern as promoSettings/licenseSettings (src/data/promotions.ts). Not
 * per-visitor state, so no userId scoping; reads/writes always target the
 * fixed "global" row. No admin UI exists for this yet (Tier B) — these
 * functions exist so affiliateProgram.ts has real settings to read.
 */

export interface AffiliateSettings {
  commissionRate: number;
  attributionWindowDays: number;
  holdPeriodDays: number;
}

const AFFILIATE_SETTINGS_ID = "global";

export const DEFAULT_AFFILIATE_SETTINGS: AffiliateSettings = {
  commissionRate: 0.1,
  attributionWindowDays: 30,
  holdPeriodDays: 30,
};

function db() {
  return drizzle(sql());
}

function rowToSettings(row: AffiliateSettingsRow): AffiliateSettings {
  return {
    commissionRate: row.commissionRate,
    attributionWindowDays: row.attributionWindowDays,
    holdPeriodDays: row.holdPeriodDays,
  };
}

/* ─── Internal server functions ─── */

const dbGetAffiliateSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<AffiliateSettings> => {
    const database = db();
    const rows = await database
      .select()
      .from(affiliateSettings)
      .where(eq(affiliateSettings.id, AFFILIATE_SETTINGS_ID));
    if (rows[0]) return rowToSettings(rows[0]);

    await database
      .insert(affiliateSettings)
      .values({ id: AFFILIATE_SETTINGS_ID, ...DEFAULT_AFFILIATE_SETTINGS })
      .onConflictDoNothing();
    return { ...DEFAULT_AFFILIATE_SETTINGS };
  },
);

const dbSaveAffiliateSettings = createServerFn({ method: "POST" })
  .validator((settings: AffiliateSettings) => settings)
  .handler(async ({ data: settings }): Promise<void> => {
    await requireAdmin();
    await db()
      .insert(affiliateSettings)
      .values({ id: AFFILIATE_SETTINGS_ID, ...settings })
      .onConflictDoUpdate({
        target: affiliateSettings.id,
        set: { ...settings },
      });
  });

/* ─── Public API ─── */

export async function getAffiliateSettings(): Promise<AffiliateSettings> {
  return dbGetAffiliateSettings();
}

export async function saveAffiliateSettings(settings: AffiliateSettings): Promise<void> {
  return dbSaveAffiliateSettings({ data: settings });
}
