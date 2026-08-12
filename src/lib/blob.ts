/**
 * Server function for uploading the catalog cover image (public store).
 * Mirrors the createServerFn + requireAdmin() pattern used throughout
 * src/db/queries.ts. Unlike the media file (private store, uploaded
 * client-side via src/routes/api/blob/media-upload.ts), the cover image
 * is small enough to route through a normal server function: the client
 * sends the File as FormData, this handler uploads it with put() using
 * BLOB_COVERS_READ_WRITE_TOKEN, and returns the resulting public URL.
 */
import { createServerFn } from "@tanstack/react-start";
import { put, del } from "@vercel/blob";
import { requireAdmin } from "~/lib/requireAdmin";

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
    const blob = await put(file.name, file, {
      access: "public",
      addRandomSuffix: true,
      token: process.env.BLOB_COVERS_READ_WRITE_TOKEN,
    });
    return blob.url;
  });

/**
 * Deletes a catalog item's cover/media blobs from their respective stores.
 * Called from handleDelete (CatalogDashboard.tsx) before the catalog_items
 * row is removed, so a Blob failure leaves the row intact and recoverable
 * rather than creating a silent orphan. read-write tokens are server-only
 * secrets, so this has to be a server function rather than a direct client
 * call to del().
 */
export const deleteCatalogBlobs = createServerFn({ method: "POST" })
  .validator(
    (input: { coverUrl?: string | null; mediaUrl?: string | null }) => input,
  )
  .handler(async ({ data }): Promise<void> => {
    await requireAdmin();
    if (data.coverUrl) {
      await del(data.coverUrl, { token: process.env.BLOB_COVERS_READ_WRITE_TOKEN });
    }
    if (data.mediaUrl) {
      await del(data.mediaUrl, { token: process.env.BLOB_MEDIA_READ_WRITE_TOKEN });
    }
  });
