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

const STORAGE_KEY = "omnimedia_promo_settings";

const DEFAULTS: PromoSettings = {
  isPromoModuleEnabled: false,
  globalDiscountType: "percentage",
  globalDiscountValue: 20,
  activeCouponCode: "SAVE20",
  announcementText: "🎉 20% off storewide!",
  couponFormatRestriction: "all",
};

export function getPromoSettings(): PromoSettings {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS };
}

export function savePromoSettings(settings: PromoSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
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
  override?: PromoOverride | null,
  settings?: PromoSettings,
  productType?: "ebook" | "audiobook" | "video" | string
): DiscountResult {
  const effectiveSettings = settings ?? getPromoSettings();

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
  if (!effectiveSettings.isPromoModuleEnabled) {
    return { discounted: Math.round(originalPrice * 100) / 100, hasDiscount: false };
  }

  if (effectiveSettings.globalDiscountType === "percentage") {
    const discounted = originalPrice - (originalPrice * effectiveSettings.globalDiscountValue) / 100;
    return { discounted: Math.round(discounted * 100) / 100, hasDiscount: true };
  }

  if (effectiveSettings.globalDiscountType === "flat") {
    const discounted = Math.max(0, originalPrice - effectiveSettings.globalDiscountValue);
    return { discounted: Math.round(discounted * 100) / 100, hasDiscount: true };
  }

  // Coupon with format restriction
  if (effectiveSettings.globalDiscountType === "coupon") {
    if (!isCouponValidForProduct(productType ?? "", effectiveSettings)) {
      return { discounted: Math.round(originalPrice * 100) / 100, hasDiscount: false };
    }
    const discounted = originalPrice - (originalPrice * effectiveSettings.globalDiscountValue) / 100;
    return { discounted: Math.round(discounted * 100) / 100, hasDiscount: true };
  }

  return { discounted: Math.round(originalPrice * 100) / 100, hasDiscount: false };
}

export function getPromoOverride(productId: string): PromoOverride | null {
  // Override stored on the catalog item directly - handled inline in components
  return null;
}