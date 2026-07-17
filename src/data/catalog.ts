export type CatalogStatus = "live" | "coming-soon" | "retired";

export interface CatalogItem {
  id: string;
  title: string;
  author: string;
  price: number;
  type: "ebook" | "audiobook" | "video";
  format: string; // "PDF E-Book", "MP3 Audiobook", "MP4 Video Guide"
  description: string;
  coverImage: string | null; // base64 data URL from cover upload
  mediaFile: {
    name: string;
    dataUrl: string | null; // base64 data URL from file upload
  };
  createdAt: string; // ISO date string
  // Lifecycle status
  status?: CatalogStatus; // defaults to "live" if not set
  // Star ratings (from CSV import or manual)
  rating?: number; // 0-5 star rating
  reviewCount?: number; // number of reviews
  // Catalog access control
  allowLibrarian?: boolean; // Allow AI Librarian access
  allowChallenge?: boolean; // Allow Challenge engine access
  // Quiz concierge tags
  quizMood?: string[];
  quizFormat?: string[];
  quizHook?: string[];
  quizPace?: string[];
  // Loyalty rewards bonus
  promoFlatBonus?: number;
  // Promotions override
  promoOverride?: {
    hasOverride: boolean;
    overrideType: "percentage" | "flat" | "fixed";
    overrideValue: number;
  };
}

const STORAGE_KEY = "omnimedos_catalog";

function generateId(): string {
  return `catalog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getCatalogItems(): CatalogItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CatalogItem[];
  } catch {
    // ignore
  }
  return [];
}

function saveAll(items: CatalogItem[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}

export function saveCatalogItem(item: CatalogItem): void {
  const items = getCatalogItems();
  items.push(item);
  saveAll(items);
  // Flight Recorder
  if (typeof window !== "undefined") {
    import("./flightRecorder").then(({ appendTransaction }) =>
      appendTransaction("CATALOG_MUTATION", items),
    );
  }
}

export function deleteCatalogItem(id: string): void {
  const items = getCatalogItems().filter((i) => i.id !== id);
  saveAll(items);
  // Flight Recorder
  if (typeof window !== "undefined") {
    import("./flightRecorder").then(({ appendTransaction }) =>
      appendTransaction("CATALOG_MUTATION", items),
    );
  }
}

/** Get only live catalog items (excludes retired, includes coming-soon) */
export function getLiveCatalogItems(): CatalogItem[] {
  return getCatalogItems().filter((i) => i.status !== "retired");
}

/** Get only live + coming-soon (non-retired) items */
export function getActiveCatalogItems(): CatalogItem[] {
  return getCatalogItems().filter((i) => i.status !== "retired");
}

/** Get only coming-soon items */
export function getComingSoonCatalogItems(): CatalogItem[] {
  return getCatalogItems().filter((i) => i.status === "coming-soon");
}

/** Update a catalog item's status */
export function updateCatalogStatus(id: string, status: CatalogStatus): void {
  const items = getCatalogItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return;
  items[idx] = { ...items[idx], status };
  saveAll(items);
  if (typeof window !== "undefined") {
    import("./flightRecorder").then(({ appendTransaction }) =>
      appendTransaction("CATALOG_MUTATION", items),
    );
  }
}

/** Update a catalog item's rating */
export function updateCatalogRating(id: string, rating: number, reviewCount?: number): void {
  const items = getCatalogItems();
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) return;
  items[idx] = { ...items[idx], rating: Math.max(0, Math.min(5, rating)), reviewCount: reviewCount ?? items[idx].reviewCount };
  saveAll(items);
}

export function createCatalogItem(input: {
  title: string;
  author: string;
  price: number;
  type: "ebook" | "audiobook" | "video";
  format: string;
  description: string;
  coverImage: string | null;
  mediaFile: { name: string; dataUrl: string | null };
  status?: CatalogStatus;
  rating?: number;
  reviewCount?: number;
  quizMood?: string[];
  quizFormat?: string[];
  quizHook?: string[];
  quizPace?: string[];
}): CatalogItem {
  return {
    ...input,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
}