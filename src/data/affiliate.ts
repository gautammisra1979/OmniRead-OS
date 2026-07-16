export interface AffiliateProfile {
  handle: string;
  brandName: string;
  registeredAt: string;
  paymentMethod: "paypal" | "venmo" | "crypto";
  paymentDetail: string;
}

export interface AffiliateLedgerEntry {
  id: string;
  timestamp: string;
  referrerHandle: string;
  bookTitle: string;
  purchaseValue: number;
  commissionSlice: number;
  status: "pending" | "approved" | "paid";
}

export interface ClickEvent {
  id: string;
  timestamp: string;
  referrerHandle: string;
  sourcePage: string;
}

export interface ActiveReferrer {
  ref: string;
  timestamp: string;
}

const PROFILE_KEY = "omnimedia_affiliate_profile";
const LEDGER_KEY = "omnimedia_affiliate_ledger";
const CLICKS_KEY = "omnimedia_affiliate_clicks";
const REFERRER_KEY = "omnimedia_active_referrer";

const COMMISSION_RATE = 0.1; // 10%

function generateId(): string {
  return `aff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ─── Profile ─── */

export function getAffiliateProfile(): AffiliateProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw) as AffiliateProfile;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveAffiliateProfile(profile: AffiliateProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function handleExists(handle: string): boolean {
  if (typeof window === "undefined") return false;
  const existing = getAffiliateProfile();
  return existing !== null && existing.handle.toLowerCase() === handle.toLowerCase();
}

/* ─── Ledger ─── */

export function getAffiliateLedger(): AffiliateLedgerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (raw) return JSON.parse(raw) as AffiliateLedgerEntry[];
  } catch {
    /* ignore */
  }
  return [];
}

function saveLedger(entries: AffiliateLedgerEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LEDGER_KEY, JSON.stringify(entries));
}

export function addLedgerEntry(entry: Omit<AffiliateLedgerEntry, "id" | "timestamp">): void {
  const ledger = getAffiliateLedger();
  ledger.unshift({
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  });
  saveLedger(ledger);
}

/* ─── Clicks ─── */

export function getClicks(): ClickEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CLICKS_KEY);
    if (raw) return JSON.parse(raw) as ClickEvent[];
  } catch {
    /* ignore */
  }
  return [];
}

function saveClicks(clicks: ClickEvent[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLICKS_KEY, JSON.stringify(clicks));
}

export function recordClick(referrerHandle: string, sourcePage: string): void {
  const clicks = getClicks();
  clicks.unshift({
    id: generateId(),
    timestamp: new Date().toISOString(),
    referrerHandle,
    sourcePage,
  });
  saveClicks(clicks);
}

/* ─── Active Referrer ─── */

export function getActiveReferrer(): ActiveReferrer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(REFERRER_KEY);
    if (raw) return JSON.parse(raw) as ActiveReferrer;
  } catch {
    /* ignore */
  }
  return null;
}

export function setActiveReferrer(ref: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REFERRER_KEY, JSON.stringify({ ref, timestamp: new Date().toISOString() }));
}

export function clearActiveReferrer(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REFERRER_KEY);
}

/* ─── Calculations ─── */

export function calculateCommission(purchaseValue: number): number {
  return Math.round(purchaseValue * COMMISSION_RATE * 100) / 100;
}

export function getTotalClicks(handle: string): number {
  return getClicks().filter((c) => c.referrerHandle.toLowerCase() === handle.toLowerCase()).length;
}

export function getConversionRate(handle: string): number {
  const totalClicks = getTotalClicks(handle);
  if (totalClicks === 0) return 0;
  const totalSales = getAffiliateLedger().filter((e) => e.referrerHandle.toLowerCase() === handle.toLowerCase()).length;
  return Math.round((totalSales / totalClicks) * 10000) / 100;
}

export function getUnpaidEarnings(handle: string): number {
  return getAffiliateLedger()
    .filter((e) => e.referrerHandle.toLowerCase() === handle.toLowerCase() && (e.status === "pending" || e.status === "approved"))
    .reduce((sum, e) => sum + e.commissionSlice, 0);
}

export function getTotalPaidOut(handle: string): number {
  return getAffiliateLedger()
    .filter((e) => e.referrerHandle.toLowerCase() === handle.toLowerCase() && e.status === "paid")
    .reduce((sum, e) => sum + e.commissionSlice, 0);
}

export function getTotalEarnings(handle: string): number {
  return getAffiliateLedger()
    .filter((e) => e.referrerHandle.toLowerCase() === handle.toLowerCase())
    .reduce((sum, e) => sum + e.commissionSlice, 0);
}

export function markLedgerAsPaid(handle: string): void {
  const ledger = getAffiliateLedger();
  const updated = ledger.map((e) =>
    e.referrerHandle.toLowerCase() === handle.toLowerCase() && e.status === "approved"
      ? { ...e, status: "paid" as const }
      : e
  );
  saveLedger(updated);
}

export function getAllAffiliateHandles(): string[] {
  const profile = getAffiliateProfile();
  if (!profile) return [];
  return [profile.handle];
}