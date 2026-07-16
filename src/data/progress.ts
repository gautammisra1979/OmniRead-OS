// Progress tracking data layer for the 30-Day Reading Challenge

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

const PROGRESS_KEY = "omnimedos_progress";
const PACING_KEY = "omnimedos_pacing";
const REVIEWS_KEY = "omnimedos_reviews";
const REMINDER_KEY = "omnimedos_reminder_interval";

// ─── Progress ───

export function getProgressEntries(): ProgressEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return JSON.parse(raw) as ProgressEntry[];
  } catch { /* ignore */ }
  return [];
}

function saveAllProgress(entries: ProgressEntry[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(entries));
  }
}

export function saveProgressEntry(entry: ProgressEntry): void {
  const entries = getProgressEntries();
  const idx = entries.findIndex((e) => e.productId === entry.productId);
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }
  saveAllProgress(entries);
  // Flight Recorder
  if (typeof window !== "undefined") {
    import("./flightRecorder").then(({ appendTransaction }) =>
      appendTransaction("CHALLENGE_PROGRESS_SAVE", entries),
    );
  }
}

export function getProgressForProduct(productId: string): ProgressEntry | undefined {
  return getProgressEntries().find((e) => e.productId === productId);
}

// ─── Pacing ───

export function getPacingConfig(): PacingConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PACING_KEY);
    if (raw) return JSON.parse(raw) as PacingConfig;
  } catch { /* ignore */ }
  return null;
}

export function savePacingConfig(config: PacingConfig): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(PACING_KEY, JSON.stringify(config));
  }
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

// ─── Reviews ───

export function getReviews(): ReviewData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REVIEWS_KEY);
    if (raw) return JSON.parse(raw) as ReviewData[];
  } catch { /* ignore */ }
  return [];
}

function saveAllReviews(reviews: ReviewData[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
  }
}

export function getReviewForProduct(productId: string): ReviewData | undefined {
  return getReviews().find((r) => r.productId === productId);
}

export function saveReview(review: ReviewData): void {
  const reviews = getReviews();
  const idx = reviews.findIndex((r) => r.id === review.id);
  if (idx >= 0) {
    reviews[idx] = review;
  } else {
    reviews.push(review);
  }
  saveAllReviews(reviews);
}

export function generateReviewId(): string {
  return `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Reminder Interval ───

export function getReminderInterval(): number {
  if (typeof window === "undefined") return 1;
  const val = localStorage.getItem(REMINDER_KEY);
  return val ? parseInt(val, 10) : 1;
}

export function saveReminderInterval(days: number): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(REMINDER_KEY, String(days));
  }
}

// ─── Challenge Day Calculation ───

export function getCurrentChallengeDay(): number {
  const config = getPacingConfig();
  if (!config) return 1;
  const dayStart = new Date(config.dayStart);
  const now = new Date();
  const elapsedMs = now.getTime() - dayStart.getTime();
  const day = Math.min(30, Math.max(1, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)) + 1));
  return day;
}