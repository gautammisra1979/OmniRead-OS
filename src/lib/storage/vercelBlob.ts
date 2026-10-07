import { put, del, issueSignedToken, presignUrl } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { requireAdmin } from "~/lib/requireAdmin";
import { contentTypeForKey, isGeneratedKey } from "./keys";
import type { StorageProvider, StorageVisibility } from "./types";

const UPLOAD_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_PUBLIC_SOURCE = "https://*.public.blob.vercel-storage.com";
const PRIVATE_SOURCE = "https://*.private.blob.vercel-storage.com";

// Env vars are read inside functions only, never at module load.
function tokenFor(visibility: StorageVisibility): string | undefined {
  return visibility === "public"
    ? process.env.BLOB_COVERS_READ_WRITE_TOKEN
    : process.env.BLOB_MEDIA_READ_WRITE_TOKEN;
}

let warnedMissingBase = false;

export const vercelBlobProvider: StorageProvider = {
  async putObject(key, body, { visibility, contentType }) {
    await put(key, body, {
      access: visibility,
      contentType,
      addRandomSuffix: false,
      allowOverwrite: false,
      token: tokenFor(visibility),
    });
  },

  async deleteObject(key, visibility) {
    await del(key, { token: tokenFor(visibility) });
  },

  publicUrl(key) {
    const base = process.env.STORAGE_PUBLIC_BASE_URL;
    if (!base) {
      if (!warnedMissingBase) {
        warnedMissingBase = true;
        console.error("STORAGE_PUBLIC_BASE_URL is not set; public storage URLs cannot be built");
      }
      return null;
    }
    return `${base.replace(/\/+$/, "")}/${key}`;
  },

  cspConnectOrigins() {
    // Trailing slash limits the source to that path prefix.
    return ["https://vercel.com/api/blob/"];
  },

  cspSources() {
    let pub = DEFAULT_PUBLIC_SOURCE;
    try {
      const url = new URL(process.env.STORAGE_PUBLIC_BASE_URL ?? "");
      if (url.protocol === "https:") pub = url.origin;
    } catch {
      // unset or unparsable: keep the default
    }
    return { img: [pub], media: [PRIVATE_SOURCE, pub] };
  },

  async signedReadUrl(key, expiresInSeconds) {
    const validUntil = Date.now() + expiresInSeconds * 1000;
    const token = await issueSignedToken({
      pathname: key,
      operations: ["get"],
      validUntil,
      token: process.env.BLOB_MEDIA_READ_WRITE_TOKEN,
    });
    const { presignedUrl } = await presignUrl(token, {
      operation: "get",
      pathname: key,
      access: "private",
      validUntil,
    });
    return presignedUrl;
  },

  async handleClientUpload(request) {
    try {
      const body = (await request.json()) as HandleUploadPresignedBody;
      const jsonResponse = await handleUploadPresigned({
        body,
        request,
        webhookPublicKey: process.env.BLOB_MEDIA_WEBHOOK_PUBLIC_KEY,
        getSignedToken: async (pathname) => {
          await requireAdmin();
          const contentType = isGeneratedKey("media", pathname)
            ? contentTypeForKey("media", pathname)
            : null;
          if (!contentType) throw new Error("Invalid media key");
          const validUntil = Date.now() + UPLOAD_WINDOW_MS;
          const token = await issueSignedToken({
            pathname,
            operations: ["put"],
            allowedContentTypes: [contentType],
            validUntil,
            token: process.env.BLOB_MEDIA_READ_WRITE_TOKEN,
          });
          return {
            token,
            urlOptions: {
              allowedContentTypes: [contentType],
              addRandomSuffix: false,
              allowOverwrite: false,
              validUntil,
            },
          };
        },
      });
      return Response.json(jsonResponse);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Upload failed" },
        { status: 400 },
      );
    }
  },
};
