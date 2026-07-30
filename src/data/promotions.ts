import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { promoSettings, type PromoSettingsRow } from "~/db/schema";
import { requireAdmin } from "~/lib/requireAdmin";

/**
 * Phase 4 (Step 26): DB-backed promotions settings, replacing the
 * localStorage version. This is a single global, admin-managed settings
 * row — not per-visitor state — so like knowledgeRows there is deliberately
 * no ownerId scoping, and all reads/writes target the fixed "global" row.
 *
 * calculateDiscountedPrice() and isCouponValidForProduct() stay pure and
 * synchronous — they never touch storage. Since getPromoSettings() is now
 * async, calculateDiscountedPrice() no longer falls back to fetching
 * settings itself; callers must fetch settings first and pass them in.
 */

export type DiscountType = "percentage" | "flat" | "coupon";

export interface PromoSettings {
  isPromoModuleEnabled: boolean;
  globalDiscountType: DiscountType;
  globalDiscountValue: number;
  activeCouponCode: string;
  announcementText: string;
  couponFormatRestriction?: "all" | "ebook" | "audiobook" | "video";
}

export interface PromoOverride {
  hasOverride: boolean;
  overrideType: "percentage" | "flat" | "fixed";
  overrideValue: number;
}

const PROMO_SETTINGS_ID = "global";

export const DEFAULT_PROMO_SETTINGS: PromoSettings = {
  isPromoModuleEnabled: false,
  globalDiscountType: "percentage",
  globalDiscountValue: 20,
  activeCouponCode: "SAVE20",
  announcementText: "🎉 20% off storewide!",
  couponFormatRestriction: "all",
};

function db() {
  return drizzle(sql());
}

function rowToPromoSettings(row: PromoSettingsRow): PromoSettings {
  return {
    isPromoModuleEnabled: row.isPromoModuleEnabled,
    globalDiscountType: row.globalDiscountType as DiscountType,
    globalDiscountValue: row.globalDiscountValue,
    activeCouponCode: row.activeCouponCode,
    announcementText: row.announcementText,
    couponFormatRestriction:
      (row.couponFormatRestriction as PromoSettings["couponFormatRestriction"]) ?? "all",
  };
}

/* ─── Internal server functions ─── */

const dbGetPromoSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<PromoSettings> => {
    const database = db();
    const rows = await database
      .select()
      .from(promoSettings)
      .where(eq(promoSettings.id, PROMO_SETTINGS_ID));
    if (rows[0]) return rowToPromoSettings(rows[0]);

    await database
      .insert(promoSettings)
      .values({ id: PROMO_SETTINGS_ID, ...DEFAULT_PROMO_SETTINGS })
      .onConflictDoNothing();
    return { ...DEFAULT_PROMO_SETTINGS };
  },
);

const dbSavePromoSettings = createServerFn({ method: "POST" })
  .validator((settings: PromoSettings) => settings)
  .handler(async ({ data: settings }): Promise<void> => {
    await requireAdmin();
    await db()
      .insert(promoSettings)
      .values({ id: PROMO_SETTINGS_ID, ...settings })
      .onConflictDoUpdate({
        target: promoSettings.id,
        set: { ...settings },
      });
  });

/* ─── Public API ─── */

export async function getPromoSettings(): Promise<PromoSettings> {
  return dbGetPromoSettings();
}

export async function savePromoSettings(settings: PromoSettings): Promise<void> {
  return dbSavePromoSettings({ data: settings });
}

export interface DiscountResult {
  discounted: number;
  hasDiscount: boolean;
}

export function isCouponValidForProduct(
  productType: "ebook" | "audiobook" | "video" | string,
  settings: PromoSettings
): boolean {
  if (settings.globalDiscountType !== "coupon") return true;
  if (!settings.couponFormatRestriction || settings.couponFormatRestriction === "all") return true;
  return settings.couponFormatRestriction === productType;
}

export function calculateDiscountedPrice(
  originalPrice: number,
  override: PromoOverride | null | undefined,
  settings: PromoSettings,
  productType?: "ebook" | "audiobook" | "video" | string
): DiscountResult {
  // Per-item override takes priority
  if (override?.hasOverride) {
    if (override.overrideType === "percentage") {
      const discounted = originalPrice - (originalPrice * override.overrideValue) / 100;
      return { discounted: Math.round(discounted * 100) / 100, hasDiscount: true };
    }
    if (override.overrideType === "flat") {
      const discounted = Math.max(0, originalPrice - override.overrideValue);
      return { discounted: Math.round(discounted * 100) / 100, hasDiscount: true };
    }
    if (override.overrideType === "fixed") {
      return { discounted: Math.round(override.overrideValue * 100) / 100, hasDiscount: true };
    }
  }

  // Global discount
  if (!settings.isPromoModuleEnabled) {
    return { discounted: Math.round(originalPrice * 100) / 100, hasDiscount: false };
  }

  if (settings.globalDiscountType === "percentage") {
    const discounted = originalPrice - (originalPrice * settings.globalDiscountValue) / 100;
    return { discounted: Math.round(discounted * 100) / 100, hasDiscount: true };
  }

  if (settings.globalDiscountType === "flat") {
    const discounted = Math.max(0, originalPrice - settings.globalDiscountValue);
    return { discounted: Math.round(discounted * 100) / 100, hasDiscount: true };
  }

  // Coupon with format restriction
  if (settings.globalDiscountType === "coupon") {
    if (!isCouponValidForProduct(productType ?? "", settings)) {
      return { discounted: Math.round(originalPrice * 100) / 100, hasDiscount: false };
    }
    const discounted = originalPrice - (originalPrice * settings.globalDiscountValue) / 100;
    return { discounted: Math.round(discounted * 100) / 100, hasDiscount: true };
  }

  return { discounted: Math.round(originalPrice * 100) / 100, hasDiscount: false };
}

export function getPromoOverride(productId: string): PromoOverride | null {
  // Override stored on the catalog item directly - handled inline in components
  return null;
}
