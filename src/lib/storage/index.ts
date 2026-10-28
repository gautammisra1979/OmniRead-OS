import { s3Provider } from "./s3";
import { vercelBlobProvider } from "./vercelBlob";
import type { StorageProvider } from "./types";

/** Resolves the deployment's storage provider at call time (never at module load). */
export function getStorage(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || "vercel-blob";
  if (provider === "vercel-blob") return vercelBlobProvider;
  if (provider === "r2") return s3Provider;
  throw new Error(`Unknown STORAGE_PROVIDER "${provider}"`);
}
