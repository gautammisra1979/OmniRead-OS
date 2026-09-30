import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import {
  challengeProgress,
  challengeReviews,
  challengeSettings,
  type ChallengeProgressRow,
  type ChallengeReviewRow,
} from "~/db/schema";
import { getUserId } from "~/lib/getUserId";

// Progress tracking data layer for the 30-Day Reading Challenge.
//
// Session 68: DB-backed, replacing the old browser-storage version. Rows are keyed
// by the Better Auth user_id (src/lib/getUserId.ts) — every visitor, guest or
// logged-in, has one via the `anonymous` plugin. Reviews are only ever read
// back by their author. Each public function is a plain async wrapper around
// an internal createServerFn.

export interface ProgressEntry {
  productId: string;
  productTitle: string;
  format: "ebook" | "audiobook" | "video";
  totalUnits: number;       // total pages, total duration in seconds, or total video length in seconds
  completedUnits: number;   // pages read, seconds listened, seconds watched
  lastUpdated: string;       // ISO date string
  day: number;              // challenge day (1-30)
}

export interface PacingConfig {
  dailyTarget: number;      // estimated daily target in units (pages or seconds)
  dayStart: string;         // ISO date for day 1
}

export interface ReviewData {
  id: string;
  productId: string;
  productTitle: string;
  rating: number;           // 1-5
  keyTakeaway: string;
  reviewText: string;
  actionPlan: string;
  pacingEval: "Ahead" | "On-Track" | "Behind";
  isPrivate: boolean;
  hasSpoiler: boolean;
  createdAt: string;
  updatedAt: string;
}

const MAX_PRODUCT_ID_LENGTH = 200;
const MAX_PRODUCT_TITLE_LENGTH = 300;
const FORMATS = ["ebook", "audiobook", "video"];
const PACING_EVALS = ["Ahead", "On-Track", "Behind"];

function db() {
  return drizzle(sql());
}

function isValidProductRef(productId: unknown, productTitle: unknown): boolean {
  return (
    typeof productId === "string" &&
    productId.length > 0 &&
    productId.length <= MAX_PRODUCT_ID_LENGTH &&
    typeof productTitle === "string" &&
    productTitle.length <= MAX_PRODUCT_TITLE_LENGTH
  );
}

function isFiniteNonNegative(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

function rowToProgress(row: ChallengeProgressRow): ProgressEntry {
  return {
    productId: row.productId,
    productTitle: row.productTitle,
    format: row.format as ProgressEntry["format"],
    totalUnits: row.totalUnits,
    completedUnits: row.completedUnits,
    lastUpdated: row.updatedAt.toISOString(),
    day: row.day,
  };
}

function rowToReview(row: ChallengeReviewRow): ReviewData {
  return {
    id: row.id,
    productId: row.productId,
    productTitle: row.productTitle,
    rating: row.rating,
    keyTakeaway: row.keyTakeaway,
    reviewText: row.reviewText,
    actionPlan: row.actionPlan,
    pacingEval: row.pacingEval as ReviewData["pacingEval"],
    isPrivate: row.isPrivate,
    hasSpoiler: row.hasSpoiler,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/* ─── Internal server functions ─── */

const dbGetProgressEntries = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProgressEntry[]> => {
    const userId = await getUserId();
    const rows = await db()
      .select()
      .from(challengeProgress)
      .where(eq(challengeProgress.userId, userId));
    return rows.map(rowToProgress);
  },
);

const dbGetProgressForProduct = createServerFn({ method: "GET" })
  .validator((productId: string) => productId)
  .handler(async ({ data: productId }): Promise<ProgressEntry | undefined> => {
    const userId = await getUserId();
    const rows = await db()
      .select()
      .from(challengeProgress)
      .where(and(eq(challengeProgress.userId, userId), eq(challengeProgress.productId, productId)));
    return rows[0] ? rowToProgress(rows[0]) : undefined;
  });

const dbSaveProgressEntry = createServerFn({ method: "POST" })
  .validator((entry: ProgressEntry) => entry)
  .handler(async ({ data: entry }): Promise<void> => {
    if (
      !entry ||
      !isValidProductRef(entry.productId, entry.productTitle) ||
      !FORMATS.includes(entry.format) ||
      !isFiniteNonNegative(entry.totalUnits) ||
      !isFiniteNonNegative(entry.completedUnits) ||
      !Number.isInteger(entry.day) ||
      entry.day < 1 ||
      entry.day > 30
    ) {
      return;
    }
    const userId = await getUserId();
    const values = {
      productTitle: entry.productTitle,
      format: entry.format,
      totalUnits: entry.totalUnits,
      completedUnits: entry.completedUnits,
      day: entry.day,
      updatedAt: new Date(),
    };
    await db()
      .insert(challengeProgress)
      .values({ userId, productId: entry.productId, ...values })
      .onConflictDoUpdate({
        target: [challengeProgress.userId, challengeProgress.productId],
        set: values,
      });
  });

const dbGetPacingConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<PacingConfig | null> => {
    const userId = await getUserId();
    const rows = await db()
      .select()
      .from(challengeSettings)
      .where(eq(challengeSettings.userId, userId));
    const row = rows[0];
    if (!row || !row.dayStart || row.dailyTarget === null) return null;
    return { dailyTarget: row.dailyTarget, dayStart: row.dayStart.toISOString() };
  },
);

const dbSavePacingConfig = createServerFn({ method: "POST" })
  .validator((config: PacingConfig) => config)
  .handler(async ({ data: config }): Promise<void> => {
    if (
      !config ||
      typeof config.dailyTarget !== "number" ||
      !Number.isFinite(config.dailyTarget) ||
      config.dailyTarget <= 0 ||
      typeof config.dayStart !== "string"
    ) {
      return;
    }
    const dayStart = new Date(config.dayStart);
    if (Number.isNaN(dayStart.getTime())) return;
    const userId = await getUserId();
    const values = { dailyTarget: config.dailyTarget, dayStart, updatedAt: new Date() };
    await db()
      .insert(challengeSettings)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: challengeSettings.userId, set: values });
  });

const dbGetReminderInterval = createServerFn({ method: "GET" }).handler(
  async (): Promise<number> => {
    const userId = await getUserId();
    const rows = await db()
      .select()
      .from(challengeSettings)
      .where(eq(challengeSettings.userId, userId));
    return rows[0]?.reminderIntervalDays ?? 1;
  },
);

const dbSaveReminderInterval = createServerFn({ method: "POST" })
  .validator((days: number) => days)
  .handler(async ({ data: days }): Promise<void> => {
    if (!Number.isInteger(days) || days < 1 || days > 30) return;
    const userId = await getUserId();
    const values = { reminderIntervalDays: days, updatedAt: new Date() };
    await db()
      .insert(challengeSettings)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: challengeSettings.userId, set: values });
  });

const dbGetReviews = createServerFn({ method: "GET" }).handler(
  async (): Promise<ReviewData[]> => {
    const userId = await getUserId();
    const rows = await db()
      .select()
      .from(challengeReviews)
      .where(eq(challengeReviews.userId, userId));
    return rows.map(rowToReview);
  },
);

const dbGetReviewForProduct = createServerFn({ method: "GET" })
  .validator((productId: string) => productId)
  .handler(async ({ data: productId }): Promise<ReviewData | undefined> => {
    const userId = await getUserId();
    const rows = await db()
      .select()
      .from(challengeReviews)
      .where(and(eq(challengeReviews.userId, userId), eq(challengeReviews.productId, productId)));
    return rows[0] ? rowToReview(rows[0]) : undefined;
  });

const dbSaveReview = createServerFn({ method: "POST" })
  .validator((review: ReviewData) => review)
  .handler(async ({ data: review }): Promise<void> => {
    if (
      !review ||
      !isValidProductRef(review.productId, review.productTitle) ||
      !Number.isInteger(review.rating) ||
      review.rating < 1 ||
      review.rating > 5 ||
      typeof review.keyTakeaway !== "string" ||
      review.keyTakeaway.length > 500 ||
      typeof review.reviewText !== "string" ||
      review.reviewText.length > 5000 ||
      typeof review.actionPlan !== "string" ||
      review.actionPlan.length > 2000 ||
      !PACING_EVALS.includes(review.pacingEval) ||
      typeof review.isPrivate !== "boolean" ||
      typeof review.hasSpoiler !== "boolean"
    ) {
      return;
    }
    const userId = await getUserId();
    const now = new Date();
    const values = {
      productTitle: review.productTitle,
      rating: review.rating,
      keyTakeaway: review.keyTakeaway,
      reviewText: review.reviewText,
      actionPlan: review.actionPlan,
      pacingEval: review.pacingEval,
      isPrivate: review.isPrivate,
      hasSpoiler: review.hasSpoiler,
      updatedAt: now,
    };
    // The client-supplied id is never trusted: a fresh one is generated for an
    // insert, and on conflict the existing row's id and created_at are kept.
    await db()
      .insert(challengeReviews)
      .values({
        id: crypto.randomUUID(),
        userId,
        productId: review.productId,
        createdAt: now,
        ...values,
      })
      .onConflictDoUpdate({
        target: [challengeReviews.userId, challengeReviews.productId],
        set: values,
      });
  });

/* ─── Public API: Progress ─── */

export async function getProgressEntries(): Promise<ProgressEntry[]> {
  return dbGetProgressEntries();
}

export async function getProgressForProduct(productId: string): Promise<ProgressEntry | undefined> {
  return dbGetProgressForProduct({ data: productId });
}

export async function saveProgressEntry(entry: ProgressEntry): Promise<void> {
  await dbSaveProgressEntry({ data: entry });
}

/* ─── Public API: Pacing ─── */

export async function getPacingConfig(): Promise<PacingConfig | null> {
  return dbGetPacingConfig();
}

export async function savePacingConfig(config: PacingConfig): Promise<void> {
  return dbSavePacingConfig({ data: config });
}

export function calculateDeviation(
  entry: ProgressEntry,
  config: PacingConfig,
): "ahead" | "on-track" | "behind" {
  const dayStart = new Date(config.dayStart);
  const now = new Date();
  const elapsedMs = now.getTime() - dayStart.getTime();
  const elapsedDays = Math.max(1, Math.round(elapsedMs / (1000 * 60 * 60 * 24)));
  const expected = config.dailyTarget * elapsedDays;
  const diff = entry.completedUnits - expected;
  if (diff > config.dailyTarget * 0.5) return "ahead";
  if (diff < -config.dailyTarget * 0.5) return "behind";
  return "on-track";
}

/* ─── Public API: Reviews ─── */

export async function getReviews(): Promise<ReviewData[]> {
  return dbGetReviews();
}

export async function getReviewForProduct(productId: string): Promise<ReviewData | undefined> {
  return dbGetReviewForProduct({ data: productId });
}

export async function saveReview(review: ReviewData): Promise<void> {
  return dbSaveReview({ data: review });
}

/** Client-side placeholder only — the server generates the real id. */
export function generateReviewId(): string {
  return `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ─── Public API: Reminder Interval ─── */

export async function getReminderInterval(): Promise<number> {
  return dbGetReminderInterval();
}

export async function saveReminderInterval(days: number): Promise<void> {
  return dbSaveReminderInterval({ data: days });
}

/* ─── Challenge Day Calculation ─── */

export function getCurrentChallengeDay(config: PacingConfig | null): number {
  if (!config) return 1;
  const dayStart = new Date(config.dayStart);
  const now = new Date();
  const elapsedMs = now.getTime() - dayStart.getTime();
  const day = Math.min(30, Math.max(1, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)) + 1));
  return day;
}
