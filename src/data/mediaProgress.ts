import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { mediaProgress } from "~/db/schema";
import { getUserId } from "~/lib/getUserId";

/**
 * Session 67: DB-backed media playback position, replacing the old
 * localStorage version (keyed by `omnimedia_media_progress_<productId>`).
 * Rows are keyed by the Better Auth user_id (src/lib/getUserId.ts) — every
 * visitor, guest or logged-in, has one via the `anonymous` plugin.
 */

const MAX_PRODUCT_ID_LENGTH = 200;

function db() {
  return drizzle(sql());
}

/* ─── Internal server functions ─── */

const dbGetMediaProgress = createServerFn({ method: "GET" })
  .validator((productId: string) => productId)
  .handler(async ({ data: productId }): Promise<number> => {
    const userId = await getUserId();
    const rows = await db()
      .select()
      .from(mediaProgress)
      .where(and(eq(mediaProgress.userId, userId), eq(mediaProgress.productId, productId)));
    return rows[0]?.positionSeconds ?? 0;
  });

const dbSaveMediaProgress = createServerFn({ method: "POST" })
  .validator((data: { productId: string; currentTime: number; duration: number }) => data)
  .handler(async ({ data }): Promise<void> => {
    const { productId, currentTime, duration } = data;
    if (
      typeof productId !== "string" ||
      productId.length === 0 ||
      productId.length > MAX_PRODUCT_ID_LENGTH ||
      !Number.isFinite(currentTime) ||
      currentTime < 0 ||
      !Number.isFinite(duration) ||
      duration < 0
    ) {
      return;
    }

    const userId = await getUserId();
    await db()
      .insert(mediaProgress)
      .values({
        userId,
        productId,
        positionSeconds: currentTime,
        duration,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [mediaProgress.userId, mediaProgress.productId],
        set: { positionSeconds: currentTime, duration, updatedAt: new Date() },
      });
  });

/* ─── Public API ─── */

export async function getMediaProgress(productId: string): Promise<number> {
  return dbGetMediaProgress({ data: productId });
}

export async function saveMediaProgress(productId: string, currentTime: number, duration: number): Promise<void> {
  return dbSaveMediaProgress({ data: { productId, currentTime, duration } });
}
