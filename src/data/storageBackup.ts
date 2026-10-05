/**
 * Storage usage tracking and persona detection.
 *
 * Measures localStorage usage for the app's own keys and detects whether the
 * current visitor is the owner, an affiliate, or a buyer.
 */

/* ─── Persona Detection ─── */

export type Persona = "owner" | "buyer" | "affiliate";

export function getPersona(): Persona {
  if (typeof window === "undefined") return "buyer";
  // Owner is logged into admin
  if (sessionStorage.getItem("omnimeda_admin_auth") === "true") return "owner";
  // Check if affiliate profile exists
  try {
    const raw = localStorage.getItem("omnimedia_affiliate_profile");
    if (raw) {
      const profile = JSON.parse(raw);
      if (profile && profile.handle) return "affiliate";
    }
  } catch { /* ignore */ }
  return "buyer";
}

/* ─── Storage Usage Calculation ─── */

const OMNIMEDIA_PREFIXES = ["omnimedia", "omnimedos", "omnimeda"];

function getOmniMediaKeys(): string[] {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && OMNIMEDIA_PREFIXES.some((p) => key.startsWith(p))) {
      keys.push(key);
    }
  }
  return keys;
}

export function getLocalStorageUsageBytes(): number {
  if (typeof window === "undefined") return 0;
  let total = 0;
  for (const key of getOmniMediaKeys()) {
    const value = localStorage.getItem(key);
    if (value) {
      total += key.length + value.length;
    }
  }
  return total;
}

export function getLocalStorageLimit(): number {
  return 5 * 1024 * 1024; // 5 MB
}

export function getUsagePercentage(): number {
  const used = getLocalStorageUsageBytes();
  const limit = getLocalStorageLimit();
  return Math.min(100, Math.round((used / limit) * 100));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
