/**
 * Cloud Sync Isolation Layer — Client-Initiated Cloud Backup & Restore
 *
 * Provides serverless OAuth 2.0 Implicit Grant flow for Google Drive,
 * optimistic background sync on state mutations, and auto-restoration
 * on new devices. All cloud interactions use the Google Drive API
 * against the private, isolated appDataFolder.
 */

import { exportBackup, importBackup, type BackupPackage } from "~/data/storageBackup";

/* ─── Constants ─── */

const SESSION_TOKEN_KEY = "omnimedia_cloud_token";
const SESSION_TOKEN_EXPIRY_KEY = "omnimedia_cloud_token_expiry";
const SESSION_CLOUD_TYPE_KEY = "omnimedia_cloud_type";
const LOCAL_SYNC_TIMESTAMP_KEY = "omnimedia_sync_timestamp";
const SIMULATED_CLOUD_KEY = "omnimedia_simulated_cloud_payload";

// Google Drive OAuth 2.0 endpoints (Implicit Grant)
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_INFO_URL = "https://www.googleapis.com/oauth2/v3/tokeninfo";
const GOOGLE_DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const GOOGLE_DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

// Required scope — appDataFolder only (isolated, private)
const REQUIRED_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

// Placeholder — in production the owner would register their own OAuth client
const OAUTH_CLIENT_ID = "__OMNIMEDIA_OAUTH_CLIENT_ID__";
const OAUTH_REDIRECT_PATH = "/cloud-callback";

/* ─── Types ─── */

export type CloudProvider = "google_drive" | "dropbox" | "simulated";

export interface CloudToken {
  accessToken: string;
  expiresAt: number; // epoch ms
  scope: string;
  provider: CloudProvider;
}

export interface CloudFileMeta {
  id: string;
  name: string;
  modifiedTime: string;
}

export interface SyncStatus {
  connected: boolean;
  provider: CloudProvider | null;
  lastSyncAt: string | null;
  syncing: boolean;
}

/* ─── Persona detection for scope disclosure ─── */

export function getCloudScopeDisclosure(): string {
  return (
    "OmniMedia OS requests access ONLY to its private, isolated application folder " +
    "(Google Drive appDataFolder). This folder is invisible to other apps and to " +
    "your regular Drive files. OmniMedia OS cannot see, read, or modify any of " +
    "your personal documents, photos, or other cloud files."
  );
}

/* ─── Token management ─── */

function getStoredToken(): CloudToken | null {
  if (typeof window === "undefined") return null;
  try {
    const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
    const expiry = sessionStorage.getItem(SESSION_TOKEN_EXPIRY_KEY);
    const provider = sessionStorage.getItem(SESSION_CLOUD_TYPE_KEY) as CloudProvider | null;
    if (token && expiry && provider) {
      return {
        accessToken: token,
        expiresAt: parseInt(expiry, 10),
        scope: REQUIRED_SCOPE,
        provider,
      };
    }
  } catch { /* ignore */ }
  return null;
}

function saveToken(token: CloudToken): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_TOKEN_KEY, token.accessToken);
  sessionStorage.setItem(SESSION_TOKEN_EXPIRY_KEY, String(token.expiresAt));
  sessionStorage.setItem(SESSION_CLOUD_TYPE_KEY, token.provider);
}

function clearToken(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_TOKEN_EXPIRY_KEY);
  sessionStorage.removeItem(SESSION_CLOUD_TYPE_KEY);
}

export function isTokenValid(): boolean {
  const token = getStoredToken();
  if (!token) return false;
  // Check expiry with 5-minute buffer
  return Date.now() < token.expiresAt - 5 * 60 * 1000;
}

export function getSyncStatus(): SyncStatus {
  const token = getStoredToken();
  const lastSync = typeof window !== "undefined"
    ? localStorage.getItem(LOCAL_SYNC_TIMESTAMP_KEY)
    : null;
  return {
    connected: token !== null,
    provider: token?.provider ?? null,
    lastSyncAt: lastSync,
    syncing: false,
  };
}

/* ─── OAuth 2.0 Implicit Grant Flow ─── */

export function initiateGoogleOAuth(): void {
  if (typeof window === "undefined") return;

  const redirectUri = `${window.location.origin}${OAUTH_REDIRECT_PATH}`;
  const state = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "token",
    scope: REQUIRED_SCOPE,
    state,
    include_granted_scopes: "false",
  });

  // Store state for verification on return
  sessionStorage.setItem("omnimedia_oauth_state", state);

  window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export function extractOAuthTokenFromCallback(): CloudToken | null {
  if (typeof window === "undefined") return null;

  // Check for token in URL fragment (implicit grant returns #access_token=...)
  const hash = window.location.hash;
  if (!hash) return null;

  const params = new URLSearchParams(hash.replace("#", "?"));

  const accessToken = params.get("access_token");
  const expiresIn = params.get("expires_in"); // seconds
  const scope = params.get("scope");
  const state = params.get("state");

  // Verify state matches
  const savedState = sessionStorage.getItem("omnimedia_oauth_state");
  if (state && savedState && state !== savedState) {
    // State mismatch — possible CSRF
    return null;
  }

  if (!accessToken || !expiresIn) return null;

  // Verify scope includes our required scope
  if (scope && !scope.includes(REQUIRED_SCOPE)) {
    return null;
  }

  const token: CloudToken = {
    accessToken,
    expiresAt: Date.now() + parseInt(expiresIn, 10) * 1000,
    scope: scope ?? REQUIRED_SCOPE,
    provider: "google_drive",
  };

  saveToken(token);

  // Clean up URL
  window.history.replaceState({}, "", window.location.pathname);

  return token;
}

/* ─── Simulated cloud for demo/testing ─── */

export function connectSimulatedCloud(): CloudToken {
  const token: CloudToken = {
    accessToken: `sim_${crypto.randomUUID()}`,
    expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
    scope: REQUIRED_SCOPE,
    provider: "simulated",
  };
  saveToken(token);
  return token;
}

/* ─── Google Drive API calls ─── */

async function driveFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  if (!token || token.provider !== "google_drive") {
    throw new Error("No valid Google Drive token");
  }

  const url = `${GOOGLE_DRIVE_API_BASE}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
}

async function driveUpload(path: string, body: BodyInit, options: RequestInit = {}): Promise<Response> {
  const token = getStoredToken();
  if (!token || token.provider !== "google_drive") {
    throw new Error("No valid Google Drive token");
  }

  const url = `${GOOGLE_DRIVE_UPLOAD_BASE}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
      ...(options.headers as Record<string, string> ?? {}),
    },
    body,
  });
}

/* ─── Simulated cloud storage (localStorage-based) ─── */

function getSimulatedCloudPayload(): BackupPackage | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SIMULATED_CLOUD_KEY);
    return raw ? (JSON.parse(raw) as BackupPackage) : null;
  } catch {
    return null;
  }
}

function setSimulatedCloudPayload(backup: BackupPackage): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(SIMULATED_CLOUD_KEY, JSON.stringify(backup));
  }
}

/* ─── Cloud file management ─── */

const CLOUD_FILE_NAME = "omnimedia_sync_payload.json";

/**
 * Get the cloud file metadata (modified time, id).
 * For simulated cloud, reads from localStorage.
 */
export async function getCloudFileMeta(): Promise<CloudFileMeta | null> {
  const token = getStoredToken();
  if (!token) return null;

  if (token.provider === "simulated") {
    const payload = getSimulatedCloudPayload();
    if (!payload) return null;
    return {
      id: "simulated",
      name: CLOUD_FILE_NAME,
      modifiedTime: payload.exportedAt,
    };
  }

  if (token.provider === "google_drive") {
    try {
      // Search for file in appDataFolder
      const res = await driveFetch(
        `/files?q=name='${CLOUD_FILE_NAME}'&spaces=appDataFolder&fields=files(id,name,modifiedTime)`,
      );
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        return data.files[0] as CloudFileMeta;
      }
      return null;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Upload the current application state to the cloud.
 * Returns the modified timestamp of the uploaded file.
 */
export async function uploadToCloud(): Promise<string | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const backup = await exportBackup();
    const jsonContent = JSON.stringify(backup);
    const timestamp = new Date().toISOString();

    if (token.provider === "simulated") {
      setSimulatedCloudPayload({ ...backup, exportedAt: timestamp });
      localStorage.setItem(LOCAL_SYNC_TIMESTAMP_KEY, timestamp);
      return timestamp;
    }

    if (token.provider === "google_drive") {
      // Check if file already exists
      const existing = await getCloudFileMeta();

      if (existing) {
        // Update existing file
        await driveUpload(
          `/files/${existing.id}?uploadType=media`,
          jsonContent,
          { method: "PATCH" },
        );
      } else {
        // Create new file in appDataFolder
        const metadata = JSON.stringify({
          name: CLOUD_FILE_NAME,
          parents: ["appDataFolder"],
        });

        // Multipart upload
        const boundary = `boundary_${Date.now()}`;
        const multipartBody = [
          `--${boundary}`,
          "Content-Type: application/json; charset=UTF-8",
          "",
          metadata,
          `--${boundary}`,
          "Content-Type: application/json",
          "",
          jsonContent,
          `--${boundary}--`,
        ].join("\r\n");

        await driveUpload("/files?uploadType=multipart", multipartBody, {
          method: "POST",
          headers: {
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
        });
      }

      localStorage.setItem(LOCAL_SYNC_TIMESTAMP_KEY, timestamp);
      return timestamp;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Download the cloud backup payload.
 * Returns the parsed BackupPackage or null on failure.
 */
export async function downloadFromCloud(): Promise<BackupPackage | null> {
  const token = getStoredToken();
  if (!token) return null;

  if (token.provider === "simulated") {
    return getSimulatedCloudPayload();
  }

  if (token.provider === "google_drive") {
    try {
      const existing = await getCloudFileMeta();
      if (!existing) return null;

      const res = await driveFetch(`/files/${existing.id}?alt=media`);
      const text = await res.text();
      return JSON.parse(text) as BackupPackage;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Compare cloud file modified time with local sync timestamp.
 * Returns true if cloud is newer and restoration should be offered.
 */
export async function isCloudNewer(): Promise<boolean> {
  const meta = await getCloudFileMeta();
  if (!meta) return false;

  const localTimestamp = typeof window !== "undefined"
    ? localStorage.getItem(LOCAL_SYNC_TIMESTAMP_KEY)
    : null;

  if (!localTimestamp) return true; // No local sync record, cloud exists

  return new Date(meta.modifiedTime).getTime() > new Date(localTimestamp).getTime();
}

/* ─── Sync Worker (debounced, optimistic) ─── */

let syncTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Trigger an optimistic background sync.
 * Debounces by 3 seconds — call this after any state mutation.
 */
export function triggerSync(): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    if (!isTokenValid()) return;
    await uploadToCloud();
  }, 3000);
}

/* ─── Disconnect ─── */

export function disconnectCloud(): void {
  clearToken();
  if (typeof window !== "undefined") {
    localStorage.removeItem(LOCAL_SYNC_TIMESTAMP_KEY);
  }
}
