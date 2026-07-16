export interface LoyaltyTier {
  name: string;
  pointsRequired: number;
  multiplier: number;
}

export interface LoyaltyConfig {
  tiers: LoyaltyTier[];
  pointsPerPurchase: number;
  extraCreditsMultiplier: number;
  conversionRate: number;
  minimumRedeem: number;
}

export interface LoyaltyLedgerEntry {
  id: string;
  type: "earned" | "redeemed" | "bonus";
  points: number;
  description: string;
  timestamp: string;
  productId?: string;
}

const DRAFT_KEY = "omnimedia_loyalty_config_draft";
const PUBLISHED_KEY = "omnimedia_loyalty_config";
const LEDGER_KEY = "omnimedia_loyalty_ledger";

function generateId(): string {
  return `loyalty-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_CONFIG: LoyaltyConfig = {
  tiers: [
    { name: "Bronze", pointsRequired: 0, multiplier: 1 },
    { name: "Silver", pointsRequired: 100, multiplier: 1.5 },
    { name: "Gold", pointsRequired: 300, multiplier: 2 },
    { name: "Platinum", pointsRequired: 600, multiplier: 3 },
  ],
  pointsPerPurchase: 10,
  extraCreditsMultiplier: 1,
  conversionRate: 100,
  minimumRedeem: 50,
};

/* ─── Draft Config ─── */

export function getDraftConfig(): LoyaltyConfig {
  if (typeof window === "undefined") return structuredClone(DEFAULT_CONFIG);
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return JSON.parse(raw) as LoyaltyConfig;
  } catch {
    /* ignore */
  }
  return structuredClone(DEFAULT_CONFIG);
}

export function saveDraftConfig(config: LoyaltyConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DRAFT_KEY, JSON.stringify(config));
}

/* ─── Published Config ─── */

export function getPublishedConfig(): LoyaltyConfig {
  if (typeof window === "undefined") return structuredClone(DEFAULT_CONFIG);
  try {
    const raw = localStorage.getItem(PUBLISHED_KEY);
    if (raw) return JSON.parse(raw) as LoyaltyConfig;
  } catch {
    /* ignore */
  }
  return structuredClone(DEFAULT_CONFIG);
}

export function publishConfig(config: LoyaltyConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PUBLISHED_KEY, JSON.stringify(config));
}

export function hasPublishedConfig(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PUBLISHED_KEY) !== null;
}

/* ─── Ledger ─── */

export function getLedger(): LoyaltyLedgerEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    if (raw) return JSON.parse(raw) as LoyaltyLedgerEntry[];
  } catch {
    /* ignore */
  }
  return [];
}

export function saveLedger(entries: LoyaltyLedgerEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LEDGER_KEY, JSON.stringify(entries));
}

export function addLedgerEntry(entry: Omit<LoyaltyLedgerEntry, "id" | "timestamp">): LoyaltyLedgerEntry {
  const full: LoyaltyLedgerEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };
  const ledger = getLedger();
  ledger.unshift(full);
  saveLedger(ledger);
  // Flight Recorder
  if (typeof window !== "undefined") {
    import("./flightRecorder").then(({ appendTransaction }) =>
      appendTransaction("CREDIT_WALLET_CHANGE", ledger),
    );
  }
  return full;
}

/* ─── Points Calculations ─── */

export function getCurrentPoints(): number {
  const ledger = getLedger();
  return ledger.reduce((sum, entry) => {
    if (entry.type === "earned" || entry.type === "bonus") return sum + entry.points;
    if (entry.type === "redeemed") return sum - entry.points;
    return sum;
  }, 0);
}

export function getCurrentTier(config: LoyaltyConfig): LoyaltyTier {
  const points = getCurrentPoints();
  const sorted = [...config.tiers].sort((a, b) => b.pointsRequired - a.pointsRequired);
  for (const tier of sorted) {
    if (points >= tier.pointsRequired) return tier;
  }
  return config.tiers[0];
}

export function getNextTier(config: LoyaltyConfig): { next: LoyaltyTier | null; pointsNeeded: number; progressPercent: number } {
  const points = getCurrentPoints();
  const sorted = [...config.tiers].sort((a, b) => a.pointsRequired - b.pointsRequired);
  const highest = sorted[sorted.length - 1];

  if (points >= highest.pointsRequired) {
    return { next: null, pointsNeeded: 0, progressPercent: 100 };
  }

  for (let i = 0; i < sorted.length; i++) {
    if (points < sorted[i].pointsRequired) {
      const prevThreshold = i > 0 ? sorted[i - 1].pointsRequired : 0;
      const range = sorted[i].pointsRequired - prevThreshold;
      const progress = points - prevThreshold;
      return { next: sorted[i], pointsNeeded: sorted[i].pointsRequired - points, progressPercent: Math.round((progress / range) * 100) };
    }
  }

  return { next: null, pointsNeeded: 0, progressPercent: 100 };
}

export function calculateEarnedPoints(basePoints: number, config: LoyaltyConfig, tier?: LoyaltyTier): number {
  const effectiveConfig = config ?? getPublishedConfig();
  const effectiveTier = tier ?? getCurrentTier(effectiveConfig);
  return Math.round(basePoints * effectiveConfig.extraCreditsMultiplier * effectiveTier.multiplier);
}

export function redeemPoints(points: number, description: string): boolean {
  const balance = getCurrentPoints();
  const config = getPublishedConfig();
  if (points < config.minimumRedeem) return false;
  if (points > balance) return false;
  addLedgerEntry({ type: "redeemed", points, description });
  return true;
}

export function getEstimatedDollarValue(points: number, config: LoyaltyConfig): number {
  return points / config.conversionRate;
}