/**
 * Membership & Subscription Engine
 *
 * Provides global subscription membership tiers, checkout upsells,
 * and catalog access control flags.
 */

/* ─── Membership Types ─── */

import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import {
  membershipPlans,
  disclaimerSettings,
  infoModals,
  type MembershipPlanRow,
  type DisclaimerSettingsRow,
  type InfoModalRow,
} from "~/db/schema";
import { getCatalogItems } from "~/db/queries";
import { requireAdmin } from "~/lib/requireAdmin";
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

/* ─── Shared helpers ─── */

function db() {
  return drizzle(sql());
}

function isTrimmedLength(value: unknown, min: number, max: number): value is string {
  if (typeof value !== "string") return false;
  const n = value.trim().length;
  return n >= min && n <= max;
}

/* ─── Membership Plans ─── */

function planRowToPlan(row: MembershipPlanRow): MembershipPlan {
  return {
    id: row.id,
    name: row.name,
    tier: row.tier as MembershipTier,
    price: Number(row.price),
    features: row.features,
    allowLibrarian: row.allowLibrarian,
    allowChallenge: row.allowChallenge,
    allowDownloads: row.allowDownloads,
    allowAffiliate: row.allowAffiliate,
    storageLimit: row.storageLimit,
  };
}

async function readOrCreatePlans(): Promise<MembershipPlan[]> {
  const database = db();
  const rows = await database.select().from(membershipPlans).orderBy(asc(membershipPlans.sortOrder));
  if (rows.length > 0) return rows.map(planRowToPlan);

  await database
    .insert(membershipPlans)
    .values(
      DEFAULT_PLANS.map((p, i) => ({
        id: p.id,
        name: p.name,
        tier: p.tier,
        price: p.price.toFixed(2),
        features: p.features,
        allowLibrarian: p.allowLibrarian,
        allowChallenge: p.allowChallenge,
        allowDownloads: p.allowDownloads,
        allowAffiliate: p.allowAffiliate,
        storageLimit: p.storageLimit,
        sortOrder: i,
      })),
    )
    .onConflictDoNothing();
  // Re-read so a concurrent first insert wins consistently.
  const again = await database.select().from(membershipPlans).orderBy(asc(membershipPlans.sortOrder));
  return again.map(planRowToPlan);
}

function isValidPlanEdit(p: MembershipPlan): boolean {
  if (!p || typeof p !== "object" || typeof p.id !== "string") return false;
  if (typeof p.price !== "number" || !Number.isFinite(p.price) || p.price < 0 || p.price > 99999.99) return false;
  if (!Number.isInteger(p.storageLimit) || p.storageLimit < 0 || p.storageLimit > 1000000) return false;
  return (
    typeof p.allowLibrarian === "boolean" &&
    typeof p.allowChallenge === "boolean" &&
    typeof p.allowDownloads === "boolean" &&
    typeof p.allowAffiliate === "boolean"
  );
}

export const getMembershipPlans = createServerFn({ method: "GET" }).handler(
  async (): Promise<MembershipPlan[]> => readOrCreatePlans(),
);

export const saveMembershipPlans = createServerFn({ method: "POST" })
  .validator((plans: MembershipPlan[]) => plans)
  .handler(async ({ data: plans }): Promise<MembershipPlan[]> => {
    await requireAdmin();
    if (!Array.isArray(plans) || !plans.every(isValidPlanEdit)) return readOrCreatePlans();

    // Ensure the rows exist, then update the editable fields of known ids only.
    const stored = await readOrCreatePlans();
    const known = new Set(stored.map((p) => p.id));
    const database = db();
    for (const p of plans) {
      if (!known.has(p.id)) continue;
      await database
        .update(membershipPlans)
        .set({
          price: p.price.toFixed(2),
          storageLimit: p.storageLimit,
          allowLibrarian: p.allowLibrarian,
          allowChallenge: p.allowChallenge,
          allowDownloads: p.allowDownloads,
          allowAffiliate: p.allowAffiliate,
        })
        .where(eq(membershipPlans.id, p.id));
    }
    return readOrCreatePlans();
  });

/* ─── Customer membership stub (dead code, tracked in the backlog) ─── */

// The stub below is dead code tracked in the backlog; it reads the default plans only.
function defaultPlansSync(): MembershipPlan[] {
  return [...DEFAULT_PLANS];
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
  const plan = defaultPlansSync().find((p) => p.tier === tier);
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
  const plans = defaultPlansSync();
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

export async function generateUpsellOffers(): Promise<UpsellOffer[]> {
  const items = await getCatalogItems();
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

const DEFAULT_DISCLAIMER: DisclaimerConfig = {
  enabled: false,
  title: "Terms & Conditions",
  content: "By continuing, you agree to our terms of service and privacy policy. All digital products are licensed for personal use only.",
  acceptLabel: "I Agree",
  declineLabel: "Decline",
  requireAcceptance: true,
};

const DISCLAIMER_ID = "global";

function disclaimerRowToConfig(row: DisclaimerSettingsRow): DisclaimerConfig {
  return {
    enabled: row.enabled,
    title: row.title,
    content: row.content,
    acceptLabel: row.acceptLabel,
    declineLabel: row.declineLabel,
    requireAcceptance: row.requireAcceptance,
  };
}

function isValidDisclaimer(c: DisclaimerConfig): boolean {
  if (!c || typeof c !== "object") return false;
  return (
    typeof c.enabled === "boolean" &&
    typeof c.requireAcceptance === "boolean" &&
    isTrimmedLength(c.title, 1, 120) &&
    isTrimmedLength(c.content, 1, 5000) &&
    isTrimmedLength(c.acceptLabel, 1, 40) &&
    isTrimmedLength(c.declineLabel, 1, 40)
  );
}

async function readOrCreateDisclaimer(): Promise<DisclaimerConfig> {
  const database = db();
  const rows = await database
    .select()
    .from(disclaimerSettings)
    .where(eq(disclaimerSettings.id, DISCLAIMER_ID));
  if (rows[0]) return disclaimerRowToConfig(rows[0]);

  await database
    .insert(disclaimerSettings)
    .values({ id: DISCLAIMER_ID, ...DEFAULT_DISCLAIMER })
    .onConflictDoNothing();
  // Re-read so a concurrent first insert wins consistently.
  const again = await database
    .select()
    .from(disclaimerSettings)
    .where(eq(disclaimerSettings.id, DISCLAIMER_ID));
  return again[0] ? disclaimerRowToConfig(again[0]) : { ...DEFAULT_DISCLAIMER };
}

export const getDisclaimerConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<DisclaimerConfig> => readOrCreateDisclaimer(),
);

export const saveDisclaimerConfig = createServerFn({ method: "POST" })
  .validator((config: DisclaimerConfig) => config)
  .handler(async ({ data: config }): Promise<DisclaimerConfig> => {
    await requireAdmin();
    if (!isValidDisclaimer(config)) return readOrCreateDisclaimer();

    const values = {
      enabled: config.enabled,
      title: config.title.trim(),
      content: config.content.trim(),
      acceptLabel: config.acceptLabel.trim(),
      declineLabel: config.declineLabel.trim(),
      requireAcceptance: config.requireAcceptance,
    };
    await db()
      .insert(disclaimerSettings)
      .values({ id: DISCLAIMER_ID, ...values })
      .onConflictDoUpdate({ target: disclaimerSettings.id, set: values });
    return readOrCreateDisclaimer();
  });

/* ─── Info Modal Config ─── */

export interface InfoModalConfig {
  id: string;
  title: string;
  content: string;
  icon: string;
  linkLabel: string;
}

function infoModalRowToConfig(row: InfoModalRow): InfoModalConfig {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    icon: row.icon,
    linkLabel: row.linkLabel,
  };
}

async function listInfoModals(): Promise<InfoModalConfig[]> {
  const rows = await db().select().from(infoModals).orderBy(asc(infoModals.createdAt));
  return rows.map(infoModalRowToConfig);
}

export const getInfoModals = createServerFn({ method: "GET" }).handler(
  async (): Promise<InfoModalConfig[]> => listInfoModals(),
);

export const addInfoModal = createServerFn({ method: "POST" })
  .validator((modal: Omit<InfoModalConfig, "id">) => modal)
  .handler(async ({ data: modal }): Promise<InfoModalConfig[]> => {
    await requireAdmin();
    if (
      modal &&
      typeof modal === "object" &&
      isTrimmedLength(modal.title, 1, 120) &&
      isTrimmedLength(modal.content, 1, 5000) &&
      isTrimmedLength(modal.icon, 1, 16) &&
      isTrimmedLength(modal.linkLabel, 1, 40)
    ) {
      await db().insert(infoModals).values({
        id: crypto.randomUUID(),
        title: modal.title.trim(),
        content: modal.content.trim(),
        icon: modal.icon.trim(),
        linkLabel: modal.linkLabel.trim(),
      });
    }
    return listInfoModals();
  });

export const removeInfoModal = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => input)
  .handler(async ({ data: input }): Promise<InfoModalConfig[]> => {
    await requireAdmin();
    if (input && typeof input.id === "string") {
      await db().delete(infoModals).where(eq(infoModals.id, input.id));
    }
    return listInfoModals();
  });
