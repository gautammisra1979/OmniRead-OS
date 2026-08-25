import { createFileRoute } from "@tanstack/react-router";
import { get } from "@vercel/blob";
import { getCatalogItemById } from "~/db/queries";
import { getUserId } from "~/lib/getUserId";
import { hasPurchased } from "~/lib/mediaAccess";

/**
 * Streams a catalog item's private media file (audiobook/video) to its
 * owner. Follows the same route pattern as
 * src/routes/api/blob/media-upload.ts. No HTTP Range/206 support yet — a
 * known v1 gap, not an oversight (affects scrubbing on longer audio/video).
 */
export const Route = createFileRoute("/api/media/$productId")({
  server: {
    handlers: {
      GET: async ({ params }: { params: { productId: string } }) => {
        const userId = await getUserId();

        const item = await getCatalogItemById({ data: params.productId });
        if (!item || !item.mediaFile.dataUrl) {
          return new Response("Not found", { status: 404 });
        }

        const owns = await hasPurchased(userId, params.productId);
        if (!owns) {
          return new Response("Forbidden", { status: 403 });
        }

        const blob = await get(item.mediaFile.dataUrl, {
          access: "private",
          token: process.env.BLOB_MEDIA_READ_WRITE_TOKEN,
        });
        if (!blob) {
          return new Response("Not found", { status: 404 });
        }

        const headers = new Headers();
        headers.set("Content-Type", blob.blob.contentType || "application/octet-stream");
        if (blob.blob.size) headers.set("Content-Length", String(blob.blob.size));

        return new Response(blob.stream, { headers });
      },
    },
  },
});
