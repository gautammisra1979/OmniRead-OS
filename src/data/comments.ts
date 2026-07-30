import { createServerFn } from "@tanstack/react-start";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { comments, type CommentRow } from "~/db/schema";
import { requireAdmin } from "~/lib/requireAdmin";

/**
 * Phase 5 (Step 26): DB-backed discussion comments, replacing the
 * localStorage version. This is public content on product pages — global,
 * not per-visitor state — so like knowledgeRows/promoSettings there is
 * deliberately no ownerId scoping. `author` stays free text; there's no
 * real user identity yet (Better Auth is still deferred project-wide).
 */

export interface Comment {
  id: string;
  productId: string;
  parentId: string | null; // null = top-level comment
  author: string;
  body: string;
  createdAt: string; // ISO date
  replies: Comment[]; // recursive children
}

function db() {
  return drizzle(sql());
}

function generateId(): string {
  return `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function rowToComment(row: CommentRow): Comment {
  return {
    id: row.id,
    productId: row.productId,
    parentId: row.parentId,
    author: row.author,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    replies: [],
  };
}

/** Build the nested-reply tree from a flat list of rows for one product. */
function buildCommentTree(rows: CommentRow[]): Comment[] {
  const all = rows.map(rowToComment);
  const topLevel = all.filter((c) => c.parentId === null);
  const childMap = new Map<string, Comment[]>();
  const children = all.filter((c) => c.parentId !== null);
  for (const child of children) {
    const existing = childMap.get(child.parentId!) ?? [];
    existing.push(child);
    childMap.set(child.parentId!, existing);
  }
  function nestReplies(list: Comment[]): Comment[] {
    return list.map((c) => ({
      ...c,
      replies: nestReplies(childMap.get(c.id) ?? []),
    }));
  }
  return nestReplies(topLevel).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/* ─── Internal server functions ─── */

const dbGetCommentsForProduct = createServerFn({ method: "GET" })
  .validator((productId: string) => productId)
  .handler(async ({ data: productId }): Promise<Comment[]> => {
    const rows = await db().select().from(comments).where(eq(comments.productId, productId));
    return buildCommentTree(rows);
  });

const dbAddComment = createServerFn({ method: "POST" })
  .validator((input: { productId: string; author: string; body: string }) => input)
  .handler(async ({ data }): Promise<Comment> => {
    const comment: Comment = {
      id: generateId(),
      productId: data.productId,
      parentId: null,
      author: data.author.trim() || "Anonymous",
      body: data.body.trim(),
      createdAt: new Date().toISOString(),
      replies: [],
    };
    await db()
      .insert(comments)
      .values({
        id: comment.id,
        productId: comment.productId,
        parentId: comment.parentId,
        author: comment.author,
        body: comment.body,
        createdAt: new Date(comment.createdAt),
      });
    return comment;
  });

const dbReplyToComment = createServerFn({ method: "POST" })
  .validator((input: { parentId: string; author: string; body: string }) => input)
  .handler(async ({ data }): Promise<Comment> => {
    const database = db();
    const parentRows = await database.select().from(comments).where(eq(comments.id, data.parentId));
    const parent = parentRows[0];
    if (!parent) throw new Error("Parent comment not found");

    const reply: Comment = {
      id: generateId(),
      productId: parent.productId,
      parentId: data.parentId,
      author: data.author.trim() || "Anonymous",
      body: data.body.trim(),
      createdAt: new Date().toISOString(),
      replies: [],
    };
    await database
      .insert(comments)
      .values({
        id: reply.id,
        productId: reply.productId,
        parentId: reply.parentId,
        author: reply.author,
        body: reply.body,
        createdAt: new Date(reply.createdAt),
      });
    return reply;
  });

const dbDeleteComment = createServerFn({ method: "POST" })
  .validator((commentId: string) => commentId)
  .handler(async ({ data: commentId }): Promise<void> => {
    await requireAdmin();
    const database = db();
    const targetRows = await database.select().from(comments).where(eq(comments.id, commentId));
    const target = targetRows[0];
    if (!target) return;

    // Collect all descendant IDs recursively, then delete the whole set in
    // one batch — same descendant-collection logic as the localStorage
    // version, just fed rows for this product instead of the full array.
    const productRows = await database.select().from(comments).where(eq(comments.productId, target.productId));
    const toDelete = new Set<string>();
    function collectDescendants(id: string) {
      toDelete.add(id);
      const children = productRows.filter((c) => c.parentId === id);
      for (const child of children) {
        collectDescendants(child.id);
      }
    }
    collectDescendants(commentId);

    await database.delete(comments).where(inArray(comments.id, [...toDelete]));
  });

const dbGetProductsWithComments = createServerFn({ method: "GET" }).handler(
  async (): Promise<string[]> => {
    const rows = await db().selectDistinct({ productId: comments.productId }).from(comments);
    return rows.map((r) => r.productId);
  },
);

/* ─── Public API ─── */

/** Get all comments for a product, returning the top-level thread (flat list with nested replies) */
export async function getCommentsForProduct(productId: string): Promise<Comment[]> {
  return dbGetCommentsForProduct({ data: productId });
}

/** Add a top-level comment */
export async function addComment(productId: string, author: string, body: string): Promise<Comment> {
  return dbAddComment({ data: { productId, author, body } });
}

/** Reply to an existing comment */
export async function replyToComment(parentId: string, author: string, body: string): Promise<Comment> {
  return dbReplyToComment({ data: { parentId, author, body } });
}

/** Delete a comment and all its nested replies */
export async function deleteComment(commentId: string): Promise<void> {
  return dbDeleteComment({ data: commentId });
}

/** Seed demo comments for a product */
export async function seedDemoComments(productId: string): Promise<void> {
  const existing = await getCommentsForProduct(productId);
  if (existing.length > 0) return; // Only seed if empty

  const top1 = await addComment(productId, "ReaderJane", "This was exactly what I needed! The exercises are very practical.");
  await replyToComment(top1.id, "AuthorMike", "So glad you enjoyed it! The weekly journaling prompts really helped me too.");
  const top2 = await addComment(productId, "BookLover42", "Great content but I wish there was more on advanced topics.");
  await replyToComment(top2.id, "DrAmara", "Thanks for the feedback — I'm working on an advanced follow-up course!");
  await replyToComment(top2.id, "CuriousMind", "Agreed! The beginner section was excellent though.");
  await addComment(productId, "NightOwlReader", "Started this yesterday and I'm already on chapter 8. Can't put it down!");
}

/** Get all unique product IDs that have comments */
export async function getProductsWithComments(): Promise<string[]> {
  return dbGetProductsWithComments();
}
