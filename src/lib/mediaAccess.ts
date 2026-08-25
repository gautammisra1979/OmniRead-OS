import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { downloads } from "~/db/schema";
import { getUserId } from "~/lib/getUserId";

function db() {
  return drizzle(sql());
}

/**
 * A refunded download still counts as "purchased" here — this only gates raw
 * media bytes, and revoking access on refund is a separate decision nobody
 * has made yet. Callers that need refund-aware access should filter on
 * downloads.status themselves.
 */
export async function hasPurchased(userId: string, productId: string): Promise<boolean> {
  const rows = await db()
    .select({ id: downloads.id })
    .from(downloads)
    .where(and(eq(downloads.userId, userId), eq(downloads.productId, productId)))
    .limit(1);
  return rows.length > 0;
}

const dbCheckPurchased = createServerFn({ method: "GET" })
  .validator((productId: string) => productId)
  .handler(async ({ data: productId }): Promise<boolean> => {
    const userId = await getUserId();
    return hasPurchased(userId, productId);
  });

/** Client-callable wrapper around hasPurchased(), for components/routes that
 *  don't already run inside a server function handler. */
export async function checkPurchased(productId: string): Promise<boolean> {
  return dbCheckPurchased({ data: productId });
}
