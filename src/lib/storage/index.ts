import { vercelBlobProvider } from "./vercelBlob";
import type { StorageProvider } from "./types";

/** Resolves the deployment's storage provider at call time (never at module load). */
export function getStorage(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || "vercel-blob";
  if (provider === "vercel-blob") return vercelBlobProvider;
  throw new Error(`Unknown STORAGE_PROVIDER "${provider}"`);
}
