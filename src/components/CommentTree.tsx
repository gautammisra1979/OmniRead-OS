import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import {
  getCommentsForProduct,
  addComment,
  replyToComment,
  deleteComment,
  seedDemoComments,
  type Comment,
} from "~/data/comments";

interface CommentTreeProps {
  productId: string;
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function CommentForm({
  onSubmit,
  placeholder,
  submitLabel,
  initialAuthor = "",
}: {
  onSubmit: (author: string, body: string) => void;
  placeholder: string;
  submitLabel: string;
  initialAuthor?: string;
}) {
  const [author, setAuthor] = useState(initialAuthor);
  const [body, setBody] = useState("");
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    onSubmit(author, body);
    setBody("");
    if (!initialAuthor) setAuthor("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        type="text"
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder={t("comments.authorPlaceholder")}
        className="w-full rounded-lg border px-3 py-1.5 text-xs transition-colors focus:outline-none focus:ring-1"
        style={{
          backgroundColor: "var(--color-bg,#0f172a)",
          color: "var(--color-text,#f8fafc)",
          borderColor: "var(--color-border,#334155)",
        }}
        aria-label={t("comments.authorPlaceholder")}
        maxLength={50}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border px-3 py-2 text-xs transition-colors focus:outline-none focus:ring-1 resize-none"
        style={{
          backgroundColor: "var(--color-bg,#0f172a)",
          color: "var(--color-text,#f8fafc)",
          borderColor: "var(--color-border,#334155)",
        }}
        aria-label={placeholder}
        maxLength={2000}
        required
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!body.trim()}
          className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
          style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
          aria-label={submitLabel}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function CommentNode({
  comment,
  depth,
  onReply,
  onDelete,
  productId,
}: {
  comment: Comment;
  depth: number;
  onReply: (parentId: string, author: string, body: string) => void;
  onDelete: (id: string) => void;
  productId: string;
}) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const { t } = useLanguage();

  const handleReply = (author: string, body: string) => {
    onReply(comment.id, author, body);
    setShowReplyForm(false);
  };

  const maxDepth = 5;
  const indent = Math.min(depth, maxDepth);

  return (
    <div
      className="group"
      role="listitem"
      aria-label={`Comment by ${comment.author}`}
      style={{ marginLeft: indent > 0 ? `${indent * 16}px` : "0" }}
    >
      <div
        className="rounded-lg border p-3 transition-colors"
        style={{
          borderColor: "var(--color-border,#334155)",
          backgroundColor: depth === 0
            ? "var(--color-surface,#1e293b)"
            : "color-mix(in srgb, var(--color-surface,#1e293b) 70%, transparent)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
              aria-hidden="true"
            >
              {comment.author.charAt(0).toUpperCase()}
            </div>
            <span className="truncate text-xs font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
              {comment.author}
            </span>
            <span className="text-[10px] shrink-0" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {formatTimeAgo(comment.createdAt)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onDelete(comment.id)}
            className="shrink-0 rounded p-1 text-[10px] opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-60"
            style={{ color: "var(--color-text-muted,#94a3b8)" }}
            aria-label={t("comments.delete").replace("{author}", comment.author)}
            title={t("comments.delete").replace("{author}", comment.author)}
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <p className="mt-2 text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text,#f8fafc)" }}>
          {comment.body}
        </p>

        {/* Reply button */}
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="text-[10px] font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--color-primary,#6366f1)" }}
            aria-label={t("comments.reply")}
          >
            {showReplyForm ? t("comments.cancel") : t("comments.reply")}
          </button>
        </div>

        {/* Reply form */}
        {showReplyForm && (
          <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--color-border,#334155)" }}>
            <CommentForm
              onSubmit={handleReply}
              placeholder={t("comments.replyPlaceholder")}
              submitLabel={t("comments.postReply")}
            />
          </div>
        )}
      </div>

      {/* Nested replies */}
      {comment.replies.length > 0 && (
        <div className="mt-2 space-y-2" role="list" aria-label="Replies">
          {comment.replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              onReply={onReply}
              onDelete={onDelete}
              productId={productId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CommentTree({ productId }: CommentTreeProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const { t } = useLanguage();

  // Load comments
  useEffect(() => {
    const all = getCommentsForProduct(productId);
    setComments(all);
  }, [productId, refreshKey]);

  // Seed demo comments if no comments exist
  useEffect(() => {
    const existing = getCommentsForProduct(productId);
    if (existing.length === 0) {
      seedDemoComments(productId);
      setRefreshKey((k) => k + 1);
    }
  }, [productId]);

  const handleAddComment = useCallback(
    (author: string, body: string) => {
      addComment(productId, author, body);
      setRefreshKey((k) => k + 1);
    },
    [productId],
  );

  const handleReply = useCallback(
    (parentId: string, author: string, body: string) => {
      replyToComment(parentId, author, body);
      setRefreshKey((k) => k + 1);
    },
    [],
  );

  const handleDelete = useCallback((id: string) => {
    deleteComment(id);
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <section
      aria-label={t("comments.title")}
      className="mt-8"
    >
      <h2
        className="mb-4 text-lg font-bold"
        style={{ color: "var(--color-text,#f8fafc)" }}
      >
        {t("comments.title")}
        <span className="ml-2 text-xs font-normal" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
          ({comments.length} {comments.length === 1 ? t("comments.comment") : t("comments.comments")})
        </span>
      </h2>

      {/* Add comment form */}
      <div
        className="mb-6 rounded-lg border p-4"
        style={{
          borderColor: "var(--color-border,#334155)",
          backgroundColor: "var(--color-surface,#1e293b)",
        }}
      >
        <CommentForm
          onSubmit={handleAddComment}
          placeholder={t("comments.placeholder")}
          submitLabel={t("comments.post")}
        />
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="py-8 text-center text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
          {t("comments.empty")}
        </p>
      ) : (
        <div className="space-y-3" role="list" aria-label={t("comments.title")}>
          {comments.map((comment) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              depth={0}
              onReply={handleReply}
              onDelete={handleDelete}
              productId={productId}
            />
          ))}
        </div>
      )}
    </section>
  );
}