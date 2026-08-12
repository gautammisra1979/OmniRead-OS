import { createFileRoute } from "@tanstack/react-router";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAdmin } from "~/lib/requireAdmin";

/**
 * TanStack Start server route implementing @vercel/blob's client-upload
 * handshake for the media file (private store). Follows the same route
 * pattern as src/routes/api/auth/$.ts.
 *
 * onUploadCompleted is implemented per the Blob client-upload contract, but
 * nothing in this app relies on it firing during local dev — it's a webhook
 * Vercel calls back, and localhost isn't reachable from there. The URL used
 * to populate catalog_items.media_url comes from the resolved result of the
 * client-side upload() call (src/components/CatalogDashboard.tsx), not from
 * this callback.
 */
const ALLOWED_CONTENT_TYPES = ["application/pdf", "audio/mpeg", "video/mp4"];

export const Route = createFileRoute("/api/blob/media-upload")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const body = (await request.json()) as HandleUploadBody;

        try {
          const jsonResponse = await handleUpload({
            body,
            request,
            token: process.env.BLOB_MEDIA_READ_WRITE_TOKEN,
            onBeforeGenerateToken: async () => {
              await requireAdmin();
              return {
                allowedContentTypes: ALLOWED_CONTENT_TYPES,
                addRandomSuffix: true,
              };
            },
            onUploadCompleted: async ({ blob }) => {
              console.log("Media blob upload completed:", blob.url);
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
    },
  },
});
