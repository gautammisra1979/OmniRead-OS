import { AwsClient } from "aws4fetch";
import { requireAdmin } from "~/lib/requireAdmin";
import { contentTypeForKey, isGeneratedKey } from "./keys";
import type { StorageProvider, StorageVisibility } from "./types";

const UPLOAD_WINDOW_SECONDS = 15 * 60;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;

// Env vars are read inside functions only, never at module load.
function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function endpoint(): string {
  return env("S3_ENDPOINT").replace(/\/+$/, "");
}

function bucketFor(visibility: StorageVisibility): string {
  return env(visibility === "public" ? "S3_PUBLIC_BUCKET" : "S3_PRIVATE_BUCKET");
}

function objectUrl(key: string, visibility: StorageVisibility): string {
  return `${endpoint()}/${bucketFor(visibility)}/${key}`;
}

function client(): AwsClient {
  return new AwsClient({
    accessKeyId: env("S3_ACCESS_KEY_ID"),
    secretAccessKey: env("S3_SECRET_ACCESS_KEY"),
    service: "s3",
    region: process.env.S3_REGION || "auto",
  });
}

let warnedMissingBase = false;

export const s3Provider: StorageProvider = {
  uploadFlow: "presigned-put",

  async putObject(key, body, { visibility, contentType }) {
    const response = await client().fetch(objectUrl(key, visibility), {
      method: "PUT",
      headers: { "Content-Type": contentType, "If-None-Match": "*" },
      body,
    });
    if (!response.ok) {
      throw new Error(`Storage upload failed (${response.status})`);
    }
  },

  async deleteObject(key, visibility) {
    const response = await client().fetch(objectUrl(key, visibility), { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
      throw new Error(`Storage delete failed (${response.status})`);
    }
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
    return [`${endpoint()}/${bucketFor("private")}/`];
  },

  cspSources() {
    const url = new URL(env("STORAGE_PUBLIC_BASE_URL"));
    if (url.protocol !== "https:") throw new Error("STORAGE_PUBLIC_BASE_URL must be https");
    const privateSource = `${endpoint()}/${bucketFor("private")}/`;
    return { img: [url.origin], media: [privateSource, url.origin] };
  },

  async signedReadUrl(key, expiresInSeconds) {
    const url = new URL(objectUrl(key, "private"));
    url.searchParams.set("X-Amz-Expires", String(Math.max(1, Math.floor(expiresInSeconds))));
    const signed = await client().sign(url.toString(), {
      method: "GET",
      aws: { signQuery: true },
    });
    return signed.url;
  },

  async handleClientUpload(request) {
    try {
      await requireAdmin();
    } catch {
      return Response.json({ error: "Admin authentication required." }, { status: 401 });
    }
    try {
      const body = (await request.json()) as { key?: unknown; contentType?: unknown; size?: unknown };
      const { key, contentType, size } = body;
      if (!isGeneratedKey("media", key)) throw new Error("Invalid media key");
      if (typeof contentType !== "string" || contentTypeForKey("media", key) !== contentType) {
        throw new Error("Invalid content type");
      }
      if (
        typeof size !== "number" ||
        !Number.isInteger(size) ||
        size < 1 ||
        size > MAX_UPLOAD_BYTES
      ) {
        throw new Error("Invalid file size");
      }
      const url = new URL(objectUrl(key, "private"));
      url.searchParams.set("X-Amz-Expires", String(UPLOAD_WINDOW_SECONDS));
      const signed = await client().sign(url.toString(), {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(size),
          "If-None-Match": "*",
        },
        // allHeaders signs Content-Length (excluded by default); the browser
        // sends the file's real length itself, so it is not returned below.
        aws: { signQuery: true, allHeaders: true },
      });
      return Response.json({
        url: signed.url,
        headers: { "Content-Type": contentType, "If-None-Match": "*" },
      });
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Upload failed" },
        { status: 400 },
      );
    }
  },
};
