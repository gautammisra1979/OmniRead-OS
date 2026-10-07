/**
 * Storage server functions (replaces src/lib/blob.ts). Same
 * createServerFn + requireAdmin()-first pattern as src/db/queries.ts.
 * Covers and logos are small and route through a server function; media is
 * uploaded browser-direct (see client.ts). Postgres stores keys only.
 */
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { catalogItems } from "~/db/schema";
import { requireAdmin } from "~/lib/requireAdmin";
import { getStorage } from "./index";
import { isAllowedContentType, isGeneratedKey, newStorageKey } from "./keys";

export const uploadCoverImage = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) {
      throw new Error("Expected FormData");
    }
    const file = data.get("cover");
    if (!(file instanceof File)) {
      throw new Error("Missing cover file");
    }
    return file;
  })
  .handler(async ({ data: file }): Promise<string> => {
    await requireAdmin();
    if (!isAllowedContentType("covers", file.type)) {
      throw new Error("Cover must be a JPG or PNG image");
    }
    const key = newStorageKey("covers", file.type);
    await getStorage().putObject(key, file, {
      visibility: "public",
      contentType: file.type,
    });
    return key;
  });

/**
 * Deletes a catalog item's cover/media objects. The keys are loaded from
 * Postgres by item id, never accepted from the browser. Called before the
 * catalog_items row is removed so a storage failure leaves the row intact.
 */
export const deleteCatalogFiles = createServerFn({ method: "POST" })
  .validator((input: { itemId: string }) => input)
  .handler(async ({ data }): Promise<void> => {
    await requireAdmin();
    const rows = await drizzle(sql())
      .select({ coverKey: catalogItems.coverKey, mediaKey: catalogItems.mediaKey })
      .from(catalogItems)
      .where(eq(catalogItems.id, data.itemId));
    const row = rows[0];
    if (!row) return;
    const storage = getStorage();
    if (row.coverKey) await storage.deleteObject(row.coverKey, "public");
    if (row.mediaKey) await storage.deleteObject(row.mediaKey, "private");
  });

/**
 * Best-effort cleanup of an upload from a failed publish. Never deletes a
 * file a catalog row still references; delete failures are logged, not thrown.
 */
export const discardUnusedUpload = createServerFn({ method: "POST" })
  .validator((input: { kind: "covers" | "media"; key: string }) => input)
  .handler(async ({ data }): Promise<void> => {
    await requireAdmin();
    if (data.kind !== "covers" && data.kind !== "media") {
      throw new Error("Invalid kind");
    }
    if (!isGeneratedKey(data.kind, data.key)) throw new Error("Invalid key");
    const column = data.kind === "covers" ? catalogItems.coverKey : catalogItems.mediaKey;
    const referenced = await drizzle(sql())
      .select({ id: catalogItems.id })
      .from(catalogItems)
      .where(eq(column, data.key))
      .limit(1);
    if (referenced.length > 0) return;
    try {
      await getStorage().deleteObject(data.key, data.kind === "covers" ? "public" : "private");
    } catch (err) {
      console.error("Failed to discard unused upload", err);
    }
  });

/** Uploads the store logo to public storage. Only PNG/SVG, max 1 MB. */
const LOGO_MAX_BYTES = 1024 * 1024;

export const uploadLogoImage = createServerFn({ method: "POST" })
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) {
      throw new Error("Expected FormData");
    }
    const file = data.get("logo");
    if (!(file instanceof File)) {
      throw new Error("Missing logo file");
    }
    return file;
  })
  .handler(async ({ data: file }): Promise<string> => {
    await requireAdmin();
    if (!isAllowedContentType("logos", file.type)) {
      throw new Error("Logo must be a PNG or SVG image");
    }
    if (file.size > LOGO_MAX_BYTES) {
      throw new Error("Logo must be 1 MB or smaller");
    }
    const key = newStorageKey("logos", file.type);
    await getStorage().putObject(key, file, {
      visibility: "public",
      contentType: file.type,
    });
    return key;
  });

/** Deletes a previously uploaded logo; only generated logo keys are accepted. */
export const deleteLogoFile = createServerFn({ method: "POST" })
  .validator((key: string) => key)
  .handler(async ({ data: key }): Promise<void> => {
    await requireAdmin();
    if (!isGeneratedKey("logos", key)) throw new Error("Invalid logo key");
    await getStorage().deleteObject(key, "public");
  });
