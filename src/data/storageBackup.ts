/**
 * Storage Backup & Migrator — "Game Save State" Engine
 *
 * Provides localStorage usage tracking, HMAC-signed export/backup,
 * and integrity-verified import/restore using Web Crypto API.
 */

const HMAC_KEY_STORAGE = "omnimedia_hmac_key";
const BACKUP_VERSION = "v1.1";

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

/* ─── HMAC Key Management (Web Crypto) ─── */

async function getOrCreateHMACKey(): Promise<CryptoKey> {
  if (typeof window === "undefined") throw new Error("Not in browser");

  // Try to load existing key from storage
  const storedKeyData = localStorage.getItem(HMAC_KEY_STORAGE);
  if (storedKeyData) {
    try {
      const keyBuffer = Uint8Array.from(atob(storedKeyData), (c) => c.charCodeAt(0));
      return await crypto.subtle.importKey(
        "raw",
        keyBuffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"],
      );
    } catch {
      // Key data corrupted, generate new one
    }
  }

  // Generate a new 256-bit key
  const key = await crypto.subtle.generateKey(
    { name: "HMAC", hash: "SHA-256", length: 256 },
    true,
    ["sign", "verify"],
  );

  // Export and store the raw key bytes
  const rawKey = await crypto.subtle.exportKey("raw", key);
  const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
  localStorage.setItem(HMAC_KEY_STORAGE, keyBase64);

  return key;
}

async function calculateHMAC(key: CryptoKey, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(data),
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function verifyHMAC(
  key: CryptoKey,
  data: string,
  signature: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const signatureBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
    return await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(data),
    );
  } catch {
    return false;
  }
}

/* ─── Collect All Application State ─── */

function collectAllState(): Record<string, unknown> {
  const state: Record<string, unknown> = {};
  for (const key of getOmniMediaKeys()) {
    const value = localStorage.getItem(key);
    if (value !== null) {
      try {
        state[key] = JSON.parse(value);
      } catch {
        state[key] = value;
      }
    }
  }
  return state;
}

/* ─── Export Pipeline ─── */

export interface BackupPackage {
  version: string;
  exportedAt: string;
  state: Record<string, unknown>;
  signature: string;
}

export async function exportBackup(): Promise<BackupPackage> {
  const state = collectAllState();
  const stateJson = JSON.stringify(state);
  const key = await getOrCreateHMACKey();
  const signature = await calculateHMAC(key, stateJson);

  const backup: BackupPackage = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    state,
    signature,
  };

  return backup;
}

export function downloadBackup(backup: BackupPackage): void {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `omnimedia_${BACKUP_VERSION}_backup.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ─── Import Pipeline ─── */

export interface ImportResult {
  success: boolean;
  error?: string;
  restoredKeys: number;
}

export async function importBackup(jsonContent: string): Promise<ImportResult> {
  let parsed: BackupPackage;
  try {
    parsed = JSON.parse(jsonContent) as BackupPackage;
  } catch {
    return { success: false, error: "Invalid JSON format.", restoredKeys: 0 };
  }

  // Validate structure
  if (!parsed.state || !parsed.signature) {
    return {
      success: false,
      error: "Backup file is missing required fields (state, signature).",
      restoredKeys: 0,
    };
  }

  // Verify HMAC signature
  try {
    const key = await getOrCreateHMACKey();
    const stateJson = JSON.stringify(parsed.state);
    const isValid = await verifyHMAC(key, stateJson, parsed.signature);

    if (!isValid) {
      return {
        success: false,
        error: "Data integrity validation failed. Backup file has been modified or corrupted.",
        restoredKeys: 0,
      };
    }
  } catch {
    return {
      success: false,
      error: "Cryptographic verification failed. Cannot process this backup.",
      restoredKeys: 0,
    };
  }

  // Restore state
  let restoredCount = 0;
  for (const [key, value] of Object.entries(parsed.state)) {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(value));
      restoredCount++;
    }
  }

  return { success: true, restoredKeys: restoredCount };
}
