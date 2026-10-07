export type StorageVisibility = "public" | "private";

/** Server-side storage interface. One provider per deployment (STORAGE_PROVIDER). */
export interface StorageProvider {
  putObject(
    key: string,
    body: Blob,
    opts: { visibility: StorageVisibility; contentType: string },
  ): Promise<void>;
  deleteObject(key: string, visibility: StorageVisibility): Promise<void>;
  /** Display URL for a public object, or null if it cannot be built. */
  publicUrl(key: string): string | null;
  /** CSP connect-src sources the browser needs for direct uploads. */
  cspConnectOrigins(): string[];
  /** Browser-direct private media upload handshake. */
  handleClientUpload(request: Request): Promise<Response>;
}
