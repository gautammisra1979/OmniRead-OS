import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { catalogItems, notifyRequests } from "~/db/schema";
import { getUserId } from "~/lib/getUserId";

// Session 75: "Get Notified" requests for coming-soon products, keyed by the
// Better Auth user_id (every visitor has one via the `anonymous` plugin).
// Storage only; nothing sends notifications. Each public function is a plain
// async wrapper around an internal createServerFn.

const MAX_PRODUCT_ID_LENGTH = 200;

function db() {
  return drizzle(sql());
}

/* ─── Internal server functions ─── */

const dbGetMyNotifyRequests = createServerFn({ method: "GET" }).handler(
  async (): Promise<string[]> => {
    const userId = await getUserId();
    const rows = await db()
      .select({ productId: notifyRequests.productId })
      .from(notifyRequests)
      .where(eq(notifyRequests.userId, userId));
    return rows.map((r) => r.productId);
  },
);

const dbAddNotifyRequest = createServerFn({ method: "POST" })
  .validator((productId: string) => productId)
  .handler(async ({ data: productId }): Promise<boolean> => {
    if (
      typeof productId !== "string" ||
      productId.length === 0 ||
      productId.length > MAX_PRODUCT_ID_LENGTH
    ) {
      return false;
    }
    const userId = await getUserId();
    const items = await db()
      .select({ id: catalogItems.id })
      .from(catalogItems)
      .where(and(eq(catalogItems.id, productId), eq(catalogItems.status, "coming-soon")));
    if (items.length === 0) return false;
    await db().insert(notifyRequests).values({ userId, productId }).onConflictDoNothing();
    return true;
  });

/* ─── Public API ─── */

export async function getMyNotifyRequests(): Promise<string[]> {
  return dbGetMyNotifyRequests();
}

export async function addNotifyRequest(productId: string): Promise<boolean> {
  return dbAddNotifyRequest({ data: productId });
}
