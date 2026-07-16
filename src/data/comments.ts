export interface Comment {
  id: string;
  productId: string;
  parentId: string | null; // null = top-level comment
  author: string;
  body: string;
  createdAt: string; // ISO date
  replies: Comment[]; // recursive children
}

const STORAGE_KEY = "omnimedia_discussion_comments";

function generateId(): string {
  return `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getAllComments(): Comment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Comment[];
  } catch {
    /* ignore */
  }
  return [];
}

function saveAll(comments: Comment[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  }
}

/** Get all comments for a product, returning the top-level thread (flat list with nested replies) */
export function getCommentsForProduct(productId: string): Comment[] {
  const all = getAllComments();
  // Build tree: top-level comments only, with replies nested
  const topLevel = all.filter((c) => c.productId === productId && c.parentId === null);
  const childMap = new Map<string, Comment[]>();
  const children = all.filter((c) => c.productId === productId && c.parentId !== null);
  for (const child of children) {
    const existing = childMap.get(child.parentId!) ?? [];
    existing.push(child);
    childMap.set(child.parentId!, existing);
  }
  // Recursively nest replies
  function nestReplies(comments: Comment[]): Comment[] {
    return comments.map((c) => ({
      ...c,
      replies: nestReplies(childMap.get(c.id) ?? []),
    }));
  }
  return nestReplies(topLevel).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/** Add a top-level comment */
export function addComment(productId: string, author: string, body: string): Comment {
  const comment: Comment = {
    id: generateId(),
    productId,
    parentId: null,
    author: author.trim() || "Anonymous",
    body: body.trim(),
    createdAt: new Date().toISOString(),
    replies: [],
  };
  const all = getAllComments();
  all.push(comment);
  saveAll(all);
  return comment;
}

/** Reply to an existing comment */
export function replyToComment(parentId: string, author: string, body: string): Comment {
  const reply: Comment = {
    id: generateId(),
    productId: "", // filled from parent
    parentId,
    author: author.trim() || "Anonymous",
    body: body.trim(),
    createdAt: new Date().toISOString(),
    replies: [],
  };
  const all = getAllComments();
  // Find the parent to get its productId
  const parent = all.find((c) => c.id === parentId);
  if (!parent) throw new Error("Parent comment not found");
  reply.productId = parent.productId;
  all.push(reply);
  saveAll(all);
  return reply;
}

/** Delete a comment and all its nested replies */
export function deleteComment(commentId: string): void {
  let all = getAllComments();
  // Collect all descendant IDs recursively
  const toDelete = new Set<string>();
  function collectDescendants(id: string) {
    toDelete.add(id);
    const children = all.filter((c) => c.parentId === id);
    for (const child of children) {
      collectDescendants(child.id);
    }
  }
  collectDescendants(commentId);
  all = all.filter((c) => !toDelete.has(c.id));
  saveAll(all);
}

/** Seed demo comments for a product */
export function seedDemoComments(productId: string): void {
  const existing = getCommentsForProduct(productId);
  if (existing.length > 0) return; // Only seed if empty

  const top1 = addComment(productId, "ReaderJane", "This was exactly what I needed! The exercises are very practical.");
  replyToComment(top1.id, "AuthorMike", "So glad you enjoyed it! The weekly journaling prompts really helped me too.");
  const top2 = addComment(productId, "BookLover42", "Great content but I wish there was more on advanced topics.");
  replyToComment(top2.id, "DrAmara", "Thanks for the feedback — I'm working on an advanced follow-up course!");
  replyToComment(top2.id, "CuriousMind", "Agreed! The beginner section was excellent though.");
  addComment(productId, "NightOwlReader", "Started this yesterday and I'm already on chapter 8. Can't put it down!");
}

/** Get all unique product IDs that have comments */
export function getProductsWithComments(): string[] {
  const all = getAllComments();
  return [...new Set(all.map((c) => c.productId))];
}