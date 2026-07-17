/**
 * Membership & Subscription Engine
 *
 * Provides global subscription membership tiers, checkout upsells,
 * and catalog access control flags.
 */

/* ─── Membership Types ─── */

export type MembershipTier = "free" | "basic" | "premium" | "enterprise";

export interface MembershipPlan {
  id: string;
  name: string;
  tier: MembershipTier;
  price: number; // monthly price in $
  features: string[];
  allowLibrarian: boolean;
  allowChallenge: boolean;
  allowDownloads: boolean;
  allowAffiliate: boolean;
  storageLimit: number; // MB
}

export interface UserMembership {
  tier: MembershipTier;
  activatedAt: string;
  expiresAt: string;
  autoRenew: boolean;
  paymentMethod: string;
}

const MEMBERSHIP_KEY = "omnimedos_membership";
const PLANS_KEY = "omnimedos_membership_plans";

const DEFAULT_PLANS: MembershipPlan[] = [
  {
    id: "plan-free",
    name: "Free",
    tier: "free",
    price: 0,
    features: ["Browse catalog", "1 download per month", "Basic support"],
    allowLibrarian: false,
    allowChallenge: false,
    allowDownloads: true,
    allowAffiliate: false,
    storageLimit: 50,
  },
  {
    id: "plan-basic",
    name: "Basic",
    tier: "basic",
    price: 9.99,
    features: ["Unlimited browsing", "10 downloads per month", "Email support", "Quiz access"],
    allowLibrarian: true,
    allowChallenge: false,
    allowDownloads: true,
    allowAffiliate: false,
    storageLimit: 200,
  },
  {
    id: "plan-premium",
    name: "Premium",
    tier: "premium",
    price: 19.99,
    features: ["Unlimited downloads", "AI Librarian access", "Challenge engine", "Priority support", "Affiliate program"],
    allowLibrarian: true,
    allowChallenge: true,
    allowDownloads: true,
    allowAffiliate: true,
    storageLimit: 1000,
  },
  {
    id: "plan-enterprise",
    name: "Enterprise",
    tier: "enterprise",
    price: 49.99,
    features: ["Everything in Premium", "White-label export", "Custom branding", "API access", "Dedicated manager"],
    allowLibrarian: true,
    allowChallenge: true,
    allowDownloads: true,
    allowAffiliate: true,
    storageLimit: 5000,
  },
];

const DEFAULT_MEMBERSHIP: UserMembership = {
  tier: "free",
  activatedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  autoRenew: false,
  paymentMethod: "none",
};

/* ─── Getters & Setters ─── */

export function getMembershipPlans(): MembershipPlan[] {
  if (typeof window === "undefined") return [...DEFAULT_PLANS];
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    if (raw) return JSON.parse(raw) as MembershipPlan[];
  } catch { /* ignore */ }
  return [...DEFAULT_PLANS];
}

export function saveMembershipPlans(plans: MembershipPlan[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  }
}

export function getUserMembership(): UserMembership {
  if (typeof window === "undefined") return { ...DEFAULT_MEMBERSHIP };
  try {
    const raw = localStorage.getItem(MEMBERSHIP_KEY);
    if (raw) return { ...DEFAULT_MEMBERSHIP, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_MEMBERSHIP };
}

export function saveUserMembership(membership: UserMembership): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(MEMBERSHIP_KEY, JSON.stringify(membership));
  }
}

export function upgradeMembership(tier: MembershipTier): void {
  const plan = getMembershipPlans().find((p) => p.tier === tier);
  if (!plan) return;
  const membership: UserMembership = {
    tier,
    activatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    autoRenew: true,
    paymentMethod: "card",
  };
  saveUserMembership(membership);
}

/* ─── Access Control ─── */

export function hasAccess(feature: "librarian" | "challenge" | "downloads" | "affiliate"): boolean {
  const membership = getUserMembership();
  const plans = getMembershipPlans();
  const plan = plans.find((p) => p.tier === membership.tier);
  if (!plan) return false;
  switch (feature) {
    case "librarian": return plan.allowLibrarian;
    case "challenge": return plan.allowChallenge;
    case "downloads": return plan.allowDownloads;
    case "affiliate": return plan.allowAffiliate;
    default: return false;
  }
}

/* ─── Checkout Upsells ─── */

export interface UpsellOffer {
  productId: string;
  title: string;
  price: number;
  discountPercent: number;
  image: string | null;
  format: string;
}

const UPSELL_KEY = "omnimedos_upsell_offers";

export function getUpsellOffers(): UpsellOffer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(UPSELL_KEY);
    if (raw) return JSON.parse(raw) as UpsellOffer[];
  } catch { /* ignore */ }
  return [];
}

export function saveUpsellOffers(offers: UpsellOffer[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(UPSELL_KEY, JSON.stringify(offers));
  }
}

export function generateUpsellOffers(): UpsellOffer[] {
  const { getCatalogItems } = require("./catalog") as typeof import("./catalog");
  const items = getCatalogItems();
  return items.slice(0, 3).map((item) => ({
    productId: item.id,
    title: item.title,
    price: item.price,
    discountPercent: 15,
    image: item.coverImage,
    format: item.format,
  }));
}

/* ─── Disclaimer Modal Config ─── */

export interface DisclaimerConfig {
  enabled: boolean;
  title: string;
  content: string;
  acceptLabel: string;
  declineLabel: string;
  requireAcceptance: boolean;
}

const DISCLAIMER_KEY = "omnimedos_disclaimer";

const DEFAULT_DISCLAIMER: DisclaimerConfig = {
  enabled: false,
  title: "Terms & Conditions",
  content: "By continuing, you agree to our terms of service and privacy policy. All digital products are licensed for personal use only.",
  acceptLabel: "I Agree",
  declineLabel: "Decline",
  requireAcceptance: true,
};

export function getDisclaimerConfig(): DisclaimerConfig {
  if (typeof window === "undefined") return { ...DEFAULT_DISCLAIMER };
  try {
    const raw = localStorage.getItem(DISCLAIMER_KEY);
    if (raw) return { ...DEFAULT_DISCLAIMER, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_DISCLAIMER };
}

export function saveDisclaimerConfig(config: DisclaimerConfig): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(DISCLAIMER_KEY, JSON.stringify(config));
  }
}

/* ─── Info Modal Config ─── */

export interface InfoModalConfig {
  id: string;
  title: string;
  content: string;
  icon: string;
  linkLabel: string;
}

const INFO_MODALS_KEY = "omnimedos_info_modals";

export function getInfoModals(): InfoModalConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INFO_MODALS_KEY);
    if (raw) return JSON.parse(raw) as InfoModalConfig[];
  } catch { /* ignore */ }
  return [];
}

export function saveInfoModals(modals: InfoModalConfig[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(INFO_MODALS_KEY, JSON.stringify(modals));
  }
}

export function addInfoModal(modal: InfoModalConfig): void {
  const modals = getInfoModals();
  modals.push(modal);
  saveInfoModals(modals);
}

export function removeInfoModal(id: string): void {
  const modals = getInfoModals().filter((m) => m.id !== id);
  saveInfoModals(modals);
}