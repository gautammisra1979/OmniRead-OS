// Knowledge Base Engine

import { createServerFn } from "@tanstack/react-start";
import { and, eq, ilike, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { knowledgeRows, type KnowledgeRowRow } from "~/db/schema";
import { requireAdmin } from "~/lib/requireAdmin";

/**
 * Phase 1 (Step 26): DB-backed AI Librarian knowledge base, replacing the
 * localStorage version. Rows are global catalog content keyed by book_id —
 * not per-visitor state — so unlike cart/wallet/loyalty/downloads/
 * refund_claims, there is deliberately no ownerId scoping here, matching how
 * catalog_items is treated.
 *
 * Each public function is a plain async wrapper around an internal
 * createServerFn, preserving the original call signature.
 */

export type KnowledgeType = "theme" | "timestamp_note" | "spoiler_shield_qa" | "cross_sell_hook";

export interface KnowledgeRow {
  id: string;
  book_id: string;
  knowledge_type: KnowledgeType;
  marker_reference: string;
  content_body: string;
}

function db() {
  return drizzle(sql());
}

function rowToKnowledgeRow(row: KnowledgeRowRow): KnowledgeRow {
  return {
    id: row.id,
    book_id: row.bookId,
    knowledge_type: row.knowledgeType as KnowledgeType,
    marker_reference: row.markerReference,
    content_body: row.contentBody,
  };
}

/* ─── Internal server functions ─── */

const dbGetKnowledgeBase = createServerFn({ method: "GET" }).handler(
  async (): Promise<KnowledgeRow[]> => {
    const rows = await db().select().from(knowledgeRows);
    return rows.map(rowToKnowledgeRow);
  },
);

const dbSaveKnowledgeRow = createServerFn({ method: "POST" })
  .validator((row: KnowledgeRow) => row)
  .handler(async ({ data: row }): Promise<void> => {
    await requireAdmin();
    await db()
      .insert(knowledgeRows)
      .values({
        id: row.id,
        bookId: row.book_id,
        knowledgeType: row.knowledge_type,
        markerReference: row.marker_reference,
        contentBody: row.content_body,
      })
      .onConflictDoUpdate({
        target: knowledgeRows.id,
        set: {
          bookId: row.book_id,
          knowledgeType: row.knowledge_type,
          markerReference: row.marker_reference,
          contentBody: row.content_body,
        },
      });
  });

const dbDeleteKnowledgeRow = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<void> => {
    await requireAdmin();
    await db().delete(knowledgeRows).where(eq(knowledgeRows.id, id));
  });

const dbGetKnowledgeForBook = createServerFn({ method: "GET" })
  .validator((bookId: string) => bookId)
  .handler(async ({ data: bookId }): Promise<KnowledgeRow[]> => {
    const rows = await db().select().from(knowledgeRows).where(eq(knowledgeRows.bookId, bookId));
    return rows.map(rowToKnowledgeRow);
  });

const dbUpsertKnowledgeRows = createServerFn({ method: "POST" })
  .validator((rows: KnowledgeRow[]) => rows)
  .handler(async ({ data: rows }): Promise<void> => {
    await requireAdmin();
    if (rows.length === 0) return;
    const bookId = rows[0].book_id;
    const database = db();
    await database.delete(knowledgeRows).where(eq(knowledgeRows.bookId, bookId));
    await database.insert(knowledgeRows).values(
      rows.map((r) => ({
        id: r.id,
        bookId: r.book_id,
        knowledgeType: r.knowledge_type,
        markerReference: r.marker_reference,
        contentBody: r.content_body,
      })),
    );
  });

const dbSearchKnowledge = createServerFn({ method: "GET" })
  .validator((input: { query: string; bookId?: string }) => input)
  .handler(async ({ data: input }): Promise<KnowledgeRow[]> => {
    const pattern = `%${input.query}%`;
    const textMatch = or(
      ilike(knowledgeRows.contentBody, pattern),
      ilike(knowledgeRows.knowledgeType, pattern),
      ilike(knowledgeRows.markerReference, pattern),
    );
    const where = input.bookId ? and(eq(knowledgeRows.bookId, input.bookId), textMatch) : textMatch;
    const rows = await db().select().from(knowledgeRows).where(where);
    return rows.map(rowToKnowledgeRow);
  });

/* ─── Public API ─── */

export async function getKnowledgeBase(): Promise<KnowledgeRow[]> {
  return dbGetKnowledgeBase();
}

export async function saveKnowledgeRow(row: KnowledgeRow): Promise<void> {
  return dbSaveKnowledgeRow({ data: row });
}

export async function deleteKnowledgeRow(id: string): Promise<void> {
  return dbDeleteKnowledgeRow({ data: id });
}

export async function getKnowledgeForBook(bookId: string): Promise<KnowledgeRow[]> {
  return dbGetKnowledgeForBook({ data: bookId });
}

export async function upsertKnowledgeRows(rows: KnowledgeRow[]): Promise<void> {
  return dbUpsertKnowledgeRows({ data: rows });
}

export async function searchKnowledge(query: string, bookId?: string): Promise<KnowledgeRow[]> {
  return dbSearchKnowledge({ data: { query, bookId } });
}

export function generateKnowledgeRowId(): string {
  return `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const KNOWLEDGE_TYPES: KnowledgeType[] = [
  "theme",
  "timestamp_note",
  "spoiler_shield_qa",
  "cross_sell_hook",
];
