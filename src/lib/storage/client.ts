import { uploadPresigned } from "@vercel/blob/client";
import { newStorageKey } from "./keys";
import { getMediaUploadFlow } from "./serverFns";

/**
 * Browser-direct private media upload. Returns the storage key to persist.
 * Only file allowed to import @vercel/blob/client; the flow is chosen by the
 * active storage adapter.
 */
export async function uploadMediaFile(file: File): Promise<string> {
  const flow = await getMediaUploadFlow();
  const key = newStorageKey("media", file.type);
  if (flow === "presigned-put") {
    const handshake = await fetch("/api/storage/media-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, contentType: file.type, size: file.size }),
    });
    if (!handshake.ok) throw new Error("Could not start the media upload");
    const { url, headers } = (await handshake.json()) as {
      url: string;
      headers: Record<string, string>;
    };
    const response = await fetch(url, { method: "PUT", headers, body: file });
    if (!response.ok) throw new Error(`Media upload failed (${response.status})`);
    return key;
  }
  const result = await uploadPresigned(key, file, {
    access: "private",
    handleUploadUrl: "/api/storage/media-upload",
    multipart: file.size > 50 * 1024 * 1024,
  });
  if (result.pathname !== key) throw new Error("Upload returned an unexpected key");
  return key;
}
