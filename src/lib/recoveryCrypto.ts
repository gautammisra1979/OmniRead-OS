/**
 * AES-GCM encryption for the admin recovery phrase at rest.
 *
 * Unlike the admin passcode (argon2id, verify-only — see
 * src/data/adminRecovery.ts), the recovery phrase must stay re-viewable
 * from the admin panel after initial setup, so a one-way hash won't work
 * here. Encryption is the middle ground: not reversible by anyone who only
 * has DB access, but recoverable with the server-only key below.
 *
 * `RECOVERY_ENCRYPTION_KEY` is a separate secret from
 * `ADMIN_SESSION_SECRET` (src/lib/requireAdmin.ts) — one signs sessions,
 * this one encrypts data at rest, and rotating one should never invalidate
 * the other. Add a random 32+ byte string to `.env.local` (dev) and the
 * Vercel project's environment variables (prod).
 */

const IV_LENGTH = 12; // AES-GCM standard nonce size, in bytes

function getKeyMaterial(): string {
  const key = process.env.RECOVERY_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "RECOVERY_ENCRYPTION_KEY is not set. Generate a random 32+ byte " +
        "string and add it to .env.local (dev) and the Vercel project's " +
        "environment variables (prod) before recovery-key storage can work.",
    );
  }
  return key;
}

async function importAesKey(): Promise<CryptoKey> {
  // Derive a fixed-length 256-bit key from the (arbitrary-length) secret
  // string via SHA-256, since AES-GCM needs an exact 128/192/256-bit key.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(getKeyMaterial()));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Encrypts a plaintext recovery phrase for storage in adminAuth.recoveryEncrypted. */
export async function encryptRecoveryPhrase(plaintext: string): Promise<string> {
  const key = await importAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return `${toBase64(iv)}.${toBase64(new Uint8Array(ciphertext))}`;
}

/** Decrypts a value produced by encryptRecoveryPhrase. Returns null on any failure. */
export async function decryptRecoveryPhrase(encrypted: string): Promise<string | null> {
  try {
    const [ivB64, ciphertextB64] = encrypted.split(".");
    if (!ivB64 || !ciphertextB64) return null;
    const key = await importAesKey();
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(ivB64) },
      key,
      fromBase64(ciphertextB64),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}
