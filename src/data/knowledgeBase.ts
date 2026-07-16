// Knowledge Base Engine

export type KnowledgeType = "theme" | "timestamp_note" | "spoiler_shield_qa" | "cross_sell_hook";

export interface KnowledgeRow {
  id: string;
  book_id: string;
  knowledge_type: KnowledgeType;
  marker_reference: string;
  content_body: string;
}

const KB_KEY = "omnimedia_librarian_kb";

function generateKbId(): string {
  return `kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getKnowledgeBase(): KnowledgeRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KB_KEY);
    if (raw) return JSON.parse(raw) as KnowledgeRow[];
  } catch { /* ignore */ }
  return [];
}

function saveAllKb(rows: KnowledgeRow[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(KB_KEY, JSON.stringify(rows));
  }
}

export function saveKnowledgeRow(row: KnowledgeRow): void {
  const rows = getKnowledgeBase();
  const idx = rows.findIndex((r) => r.id === row.id);
  if (idx >= 0) {
    rows[idx] = row;
  } else {
    rows.push(row);
  }
  saveAllKb(rows);
}

export function deleteKnowledgeRow(id: string): void {
  saveAllKb(getKnowledgeBase().filter((r) => r.id !== id));
}

export function getKnowledgeForBook(bookId: string): KnowledgeRow[] {
  return getKnowledgeBase().filter((r) => r.book_id === bookId);
}

export function upsertKnowledgeRows(rows: KnowledgeRow[]): void {
  if (rows.length === 0) return;
  const all = getKnowledgeBase();
  const bookId = rows[0].book_id;
  // Remove existing rows for this book_id
  const filtered = all.filter((r) => r.book_id !== bookId);
  // Add new rows with IDs
  const newRows = rows.map((r) => ({
    ...r,
    id: r.id || generateKbId(),
  }));
  saveAllKb([...filtered, ...newRows]);
}

export function searchKnowledge(query: string, bookId?: string): KnowledgeRow[] {
  const q = query.toLowerCase();
  const rows = bookId ? getKnowledgeForBook(bookId) : getKnowledgeBase();
  return rows.filter(
    (r) =>
      r.content_body.toLowerCase().includes(q) ||
      r.knowledge_type.toLowerCase().includes(q) ||
      r.marker_reference.toLowerCase().includes(q),
  );
}

export function generateKnowledgeRowId(): string {
  return generateKbId();
}

export const KNOWLEDGE_TYPES: KnowledgeType[] = [
  "theme",
  "timestamp_note",
  "spoiler_shield_qa",
  "cross_sell_hook",
];