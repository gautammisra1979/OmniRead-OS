import { createFileRoute } from "@tanstack/react-router";
import { getMediaKeyForItem } from "~/db/queries";
import { getUserId } from "~/lib/getUserId";
import { hasPurchased } from "~/lib/mediaAccess";
import { getStorage } from "~/lib/storage";
import { mediaUrlTtlSeconds } from "~/lib/storage/mediaTtl";

/**
 * Gives a catalog item's owner access to its private media file
 * (audiobook/video). After the sign-in and purchase checks it redirects (302)
 * to a short-lived signed URL from the active storage adapter, so the storage
 * provider serves the bytes directly, including HTTP Range requests for
 * seeking. The signed URL lifetime is MEDIA_URL_TTL_SECONDS (default 1 hour).
 */
export const Route = createFileRoute("/api/media/$productId")({
  server: {
    handlers: {
      GET: async ({ params }: { params: { productId: string } }) => {
        // getUserId() throws uncaught when there's no session (see its own
        // doc comment) — every other caller relies on that, so it's caught
        // here only, not fixed at the source. An unauthenticated request to
        // this route must get a clean 401, not a 500.
        let userId: string;
        try {
          userId = await getUserId();
        } catch {
          return new Response("Unauthorized", { status: 401 });
        }

        const key = await getMediaKeyForItem(params.productId);
        if (!key) {
          return new Response("Not found", { status: 404 });
        }

        const owns = await hasPurchased(userId, params.productId);
        if (!owns) {
          return new Response("Forbidden", { status: 403 });
        }

        let url: string;
        try {
          url = await getStorage().signedReadUrl(key, mediaUrlTtlSeconds());
        } catch (err) {
          console.error("Media signing failed:", err);
          return new Response("Media temporarily unavailable", { status: 502 });
        }

        return new Response(null, {
          status: 302,
          headers: { Location: url, "Cache-Control": "private, no-store" },
        });
      },
    },
  },
});
