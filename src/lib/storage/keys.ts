/**
 * Provider-neutral storage keys. Shared by browser and server: no env access,
 * no secrets. Postgres stores these keys (never provider URLs); the extension
 * and content type always come from the allowed-type table below, never from
 * a user-supplied file name.
 */
export type StorageKind = "covers" | "logos" | "media";

const ALLOWED: Record<StorageKind, Record<string, string>> = {
  covers: { "image/jpeg": "jpg", "image/png": "png" },
  logos: { "image/png": "png", "image/svg+xml": "svg" },
  media: { "application/pdf": "pdf", "audio/mpeg": "mp3", "video/mp4": "mp4" },
};

const UUID_V4 = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";

export function isAllowedContentType(kind: StorageKind, contentType: string): boolean {
  return Object.prototype.hasOwnProperty.call(ALLOWED[kind], contentType);
}

/** `<kind>/<uuid>.<ext>`; throws on a content type not allowed for the kind. */
export function newStorageKey(kind: StorageKind, contentType: string): string {
  if (!isAllowedContentType(kind, contentType)) {
    throw new Error(`Content type "${contentType}" is not allowed for ${kind}`);
  }
  return `${kind}/${crypto.randomUUID()}.${ALLOWED[kind][contentType]}`;
}

/** True only for exactly `<kind>/<uuid v4>.<allowed ext for kind>`. */
export function isGeneratedKey(kind: StorageKind, key: unknown): key is string {
  if (typeof key !== "string") return false;
  const match = new RegExp(`^${kind}/${UUID_V4}\\.([a-z0-9]+)$`).exec(key);
  if (!match) return false;
  return Object.values(ALLOWED[kind]).includes(match[1]);
}

/** The allowed content type matching the key's extension, or null. */
export function contentTypeForKey(kind: StorageKind, key: string): string | null {
  const ext = key.slice(key.lastIndexOf(".") + 1);
  for (const [type, e] of Object.entries(ALLOWED[kind])) {
    if (e === ext) return type;
  }
  return null;
}
