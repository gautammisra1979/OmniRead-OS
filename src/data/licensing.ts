/**
 * Step 18 — Upgrade Activation Key Verification Layer
 *
 * Web Crypto-based license key generation and verification system.
 * RSA-PSS 2048-bit key pairs for signing/verifying license tokens.
 * All state persisted in localStorage. Zero-server architecture.
 */

/* ─── Types ─── */

export interface License {
  id: string;
  type: "developer" | "trial" | "full";
  features: string[]; // e.g. ["quiz", "challenge", "progress", "affiliate", "all"]
  issuedAt: string; // ISO date
  expiresAt: string; // ISO date
  holder: string;
  maxActivations: number;
  signature: string; // base64-encoded RSA-PSS signature
  revoked: boolean;
}

export interface LicenseToken {
  id: string;
  type: string;
  features: string[];
  issuedAt: string;
  expiresAt: string;
  holder: string;
  maxActivations: number;
}

export interface KeyPairData {
  publicKey: string; // SPKI base64
  privateKey: string; // PKCS#8 base64
  generatedAt: string;
}

export interface ActivationRecord {
  licenseId: string;
  activatedAt: string;
  deviceId: string;
  userAgent: string;
}

/* ─── Storage Keys ─── */

const KEYS_KEY = "omnimedia_license_keypair";
const LICENSES_KEY = "omnimedia_licenses";
const ACTIVATIONS_KEY = "omnimedia_activations";
const ACTIVATED_FEATURES_KEY = "omnimedia_activated_features";

/* ─── Helpers ─── */

function generateId(): string {
  return `lic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = localStorage.getItem("omnimedia_device_id");
    if (!id) {
      id = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem("omnimedia_device_id", id);
    }
    return id;
  } catch {
    return `device-${Date.now()}`;
  }
}

/* ─── Key Pair Management ─── */

export function getKeyPair(): KeyPairData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEYS_KEY);
    if (raw) return JSON.parse(raw) as KeyPairData;
  } catch {
    /* ignore */
  }
  return null;
}

export function saveKeyPair(kp: KeyPairData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS_KEY, JSON.stringify(kp));
}

export function hasKeyPair(): boolean {
  return getKeyPair() !== null;
}

/**
 * Generate a new RSA-PSS 2048-bit key pair using Web Crypto API.
 * Exports as SPKI (public) and PKCS#8 (private) base64-encoded strings.
 */
export async function generateKeyPair(): Promise<KeyPairData> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );

  const publicKeyRaw = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKeyRaw = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  const publicKey = arrayBufferToBase64(publicKeyRaw);
  const privateKey = arrayBufferToBase64(privateKeyRaw);

  const kp: KeyPairData = {
    publicKey,
    privateKey,
    generatedAt: new Date().toISOString(),
  };

  saveKeyPair(kp);
  return kp;
}

/**
 * Import a public key from SPKI base64 string.
 */
async function importPublicKey(spkiBase64: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(spkiBase64);
  return crypto.subtle.importKey(
    "spki",
    raw,
    { name: "RSA-PSS", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

/**
 * Import a private key from PKCS#8 base64 string.
 */
async function importPrivateKey(pkcs8Base64: string): Promise<CryptoKey> {
  const raw = base64ToArrayBuffer(pkcs8Base64);
  return crypto.subtle.importKey(
    "pkcs8",
    raw,
    { name: "RSA-PSS", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/* ─── License Signing & Verification ─── */

/**
 * Build the license payload object (without signature).
 */
function buildLicensePayload(license: Omit<License, "signature" | "revoked">): LicenseToken {
  return {
    id: license.id,
    type: license.type,
    features: license.features,
    issuedAt: license.issuedAt,
    expiresAt: license.expiresAt,
    holder: license.holder,
    maxActivations: license.maxActivations,
  };
}

/**
 * Encode license payload as a JSON string for signing.
 */
function encodePayload(payload: LicenseToken): string {
  return JSON.stringify(payload);
}

/**
 * Sign a license payload with the stored private key.
 * Returns the base64-encoded signature.
 */
export async function signLicensePayload(
  payload: LicenseToken
): Promise<string> {
  const kp = getKeyPair();
  if (!kp) throw new Error("No key pair found. Generate one first.");

  const privateKey = await importPrivateKey(kp.privateKey);
  const data = new TextEncoder().encode(encodePayload(payload));

  const signature = await crypto.subtle.sign(
    { name: "RSA-PSS", saltLength: 32 },
    privateKey,
    data
  );

  return arrayBufferToBase64(signature);
}

/**
 * Verify a license token against its signature using the stored public key.
 * Returns the parsed LicenseToken if valid, null otherwise.
 */
export async function verifyLicenseToken(
  token: string
): Promise<LicenseToken | null> {
  try {
    // Token format: base64(payload).base64(signature)
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const kp = getKeyPair();
    if (!kp) return null;

    const publicKey = await importPublicKey(kp.publicKey);
    const payloadBytes = base64ToArrayBuffer(parts[0]);
    const signatureBytes = base64ToArrayBuffer(parts[1]);

    const valid = await crypto.subtle.verify(
      { name: "RSA-PSS", saltLength: 32 },
      publicKey,
      signatureBytes,
      payloadBytes
    );

    if (!valid) return null;

    const json = new TextDecoder().decode(payloadBytes);
    return JSON.parse(json) as LicenseToken;
  } catch {
    return null;
  }
}

/**
 * Create a full license token string from license data.
 * Format: base64(payload).base64(signature)
 */
export async function createLicenseToken(
  license: Omit<License, "signature" | "revoked">
): Promise<string> {
  const payload = buildLicensePayload(license);
  const signature = await signLicensePayload(payload);
  const encoded = base64Encode(encodePayload(payload));
  return `${encoded}.${signature}`;
}

/* ─── License CRUD ─── */

export function getLicenses(): License[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LICENSES_KEY);
    if (raw) return JSON.parse(raw) as License[];
  } catch {
    /* ignore */
  }
  return [];
}

function saveLicenses(licenses: License[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LICENSES_KEY, JSON.stringify(licenses));
}

export async function issueLicense(input: {
  type: "developer" | "trial" | "full";
  features: string[];
  holder: string;
  expiresAt: string;
  maxActivations: number;
}): Promise<License> {
  const id = generateId();
  const now = new Date().toISOString();

  const license: Omit<License, "signature" | "revoked"> = {
    id,
    type: input.type,
    features: input.features,
    issuedAt: now,
    expiresAt: input.expiresAt,
    holder: input.holder,
    maxActivations: input.maxActivations,
  };

  const signature = await signLicensePayload(buildLicensePayload(license));

  const full: License = {
    ...license,
    signature,
    revoked: false,
  };

  const licenses = getLicenses();
  licenses.push(full);
  saveLicenses(licenses);

  return full;
}

export function revokeLicense(id: string): void {
  const licenses = getLicenses();
  const idx = licenses.findIndex((l) => l.id === id);
  if (idx !== -1) {
    licenses[idx].revoked = true;
    saveLicenses(licenses);
  }
}

export function deleteLicense(id: string): void {
  saveLicenses(getLicenses().filter((l) => l.id !== id));
}

export function getLicenseById(id: string): License | undefined {
  return getLicenses().find((l) => l.id === id);
}

/* ─── Token Export / Import ─── */

export async function exportLicenseToken(licenseId: string): Promise<string | null> {
  const license = getLicenseById(licenseId);
  if (!license || license.revoked) return null;
  return createLicenseToken(license);
}

export async function importLicenseToken(token: string): Promise<{ success: boolean; message: string }> {
  const payload = await verifyLicenseToken(token);
  if (!payload) {
    return { success: false, message: "Invalid or tampered license token." };
  }

  // Check if already imported
  const existing = getLicenses();
  if (existing.find((l) => l.id === payload.id)) {
    return { success: false, message: "License already imported." };
  }

  // Check if expired
  if (new Date(payload.expiresAt) < new Date()) {
    return { success: false, message: "License has expired." };
  }

  // Reconstruct signature from token
  const parts = token.split(".");
  const signature = parts[1];

  const newLicense: License = {
    id: payload.id,
    type: payload.type as "developer" | "trial" | "full",
    features: payload.features,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    holder: payload.holder,
    maxActivations: payload.maxActivations,
    signature,
    revoked: false,
  };

  existing.push(newLicense);
  saveLicenses(existing);
  return { success: true, message: `License for "${payload.holder}" imported successfully!` };
}

/* ─── Activation & Feature Gating ─── */

export function getActivationCount(licenseId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(ACTIVATIONS_KEY);
    if (raw) {
      const records: ActivationRecord[] = JSON.parse(raw);
      return records.filter((r) => r.licenseId === licenseId).length;
    }
  } catch {
    /* ignore */
  }
  return 0;
}

function saveActivationRecord(record: ActivationRecord): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(ACTIVATIONS_KEY);
    const records: ActivationRecord[] = raw ? JSON.parse(raw) : [];
    records.push(record);
    localStorage.setItem(ACTIVATIONS_KEY, JSON.stringify(records));
  } catch {
    /* ignore */
  }
}

export function activateDevice(licenseId: string): boolean {
  const license = getLicenseById(licenseId);
  if (!license || license.revoked) return false;
  if (new Date(license.expiresAt) < new Date()) return false;

  const count = getActivationCount(licenseId);
  if (count >= license.maxActivations) return false;

  // Check if this device already activated this license
  const deviceId = getDeviceId();
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(ACTIVATIONS_KEY);
      const records: ActivationRecord[] = raw ? JSON.parse(raw) : [];
      if (records.find((r) => r.licenseId === licenseId && r.deviceId === deviceId)) {
        return true; // Already activated, no-op
      }
    } catch {
      /* ignore */
    }
  }

  saveActivationRecord({
    licenseId,
    activatedAt: new Date().toISOString(),
    deviceId,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
  });

  return true;
}

/* ─── Feature Locking ─── */

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

/**
 * Check if a specific premium feature is unlocked.
 * Checks for a valid, non-expired, non-revoked license that covers the feature.
 */
export function isFeatureUnlocked(feature: string): boolean {
  if (typeof window === "undefined") return false;

  // Admin override: if admin is authenticated, all features are unlocked
  try {
    if (sessionStorage.getItem("omnimeda_admin_auth") === "true") return true;
  } catch {
    /* ignore */
  }

  // Check activated features cache first (fast path)
  try {
    const cached = localStorage.getItem(ACTIVATED_FEATURES_KEY);
    if (cached) {
      const unlocked: string[] = JSON.parse(cached);
      if (unlocked.includes(feature) || unlocked.includes("all")) return true;
    }
  } catch {
    /* ignore */
  }

  // Full license check
  const licenses = getLicenses();
  const now = new Date();

  for (const license of licenses) {
    if (license.revoked) continue;
    if (new Date(license.expiresAt) < now) continue;

    // Check if this license covers the feature
    const covers = license.features.includes(feature) || license.features.includes("all");
    if (!covers) continue;

    // Check activation count
    const count = getActivationCount(license.id);
    if (count >= license.maxActivations) continue;

    // Feature is unlocked!
    // Cache it
    try {
      const cached = localStorage.getItem(ACTIVATED_FEATURES_KEY);
      const unlocked: string[] = cached ? JSON.parse(cached) : [];
      if (!unlocked.includes(feature)) {
        unlocked.push(feature);
        localStorage.setItem(ACTIVATED_FEATURES_KEY, JSON.stringify(unlocked));
      }
    } catch {
      /* ignore */
    }

    return true;
  }

  return false;
}

/**
 * Reset the activated features cache (called when licenses change).
 */
export function resetFeatureCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVATED_FEATURES_KEY);
}

/**
 * Get all currently unlocked premium features.
 */
export function getUnlockedFeatures(): string[] {
  const unlocked: string[] = [];
  for (const feature of PREMIUM_FEATURES) {
    if (isFeatureUnlocked(feature)) {
      unlocked.push(feature);
    }
  }
  return unlocked;
}

/**
 * Seed a demo developer license for testing.
 */
export async function seedDemoLicense(): Promise<License> {
  const future = new Date();
  future.setFullYear(future.getFullYear() + 1); // 1 year from now

  return issueLicense({
    type: "developer",
    features: ["all"],
    holder: "Demo Developer",
    expiresAt: future.toISOString(),
    maxActivations: 10,
  });
}

/* ─── Base64 Utilities ─── */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function base64Encode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}