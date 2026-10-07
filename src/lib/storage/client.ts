import { uploadPresigned } from "@vercel/blob/client";
import { newStorageKey } from "./keys";

/**
 * Browser-direct private media upload. Returns the storage key to persist.
 * Only file allowed to import @vercel/blob/client; an S3 adapter adds its own
 * branch here later.
 */
export async function uploadMediaFile(file: File): Promise<string> {
  const key = newStorageKey("media", file.type);
  const result = await uploadPresigned(key, file, {
    access: "private",
    handleUploadUrl: "/api/storage/media-upload",
    multipart: file.size > 50 * 1024 * 1024,
  });
  if (result.pathname !== key) throw new Error("Upload returned an unexpected key");
  return key;
}
