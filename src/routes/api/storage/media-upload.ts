import { createFileRoute } from "@tanstack/react-router";
import { getStorage } from "~/lib/storage";

/**
 * Browser-direct private media upload handshake. All provider logic (admin
 * check, key validation, token issuing) lives in the storage adapter.
 */
export const Route = createFileRoute("/api/storage/media-upload")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          return await getStorage().handleClientUpload(request);
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
