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

export function createCatalogItem(input: {
  title: string;
  author: string;
  price: number;
  type: "ebook" | "audiobook" | "video";
  format: string;
  description: string;
  coverImage: string | null;
  mediaFile: { name: string; dataUrl: string | null };
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