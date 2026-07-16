export interface DownloadRecord {
  id: string;
  productId: string;
  productTitle: string;
  productAuthor: string;
  productType: "ebook" | "audiobook" | "video";
  price: number;
  purchasedAt: string; // ISO date
  lastDownloadedAt: string | null; // ISO date or null
  downloadCount: number;
}

const DOWNLOADS_KEY = "omnimedos_downloads";

/** Seed demo records if no downloads exist yet */
export function seedDemoDownloads(): void {
  if (typeof window === "undefined") return;
  const raw = localStorage.getItem(DOWNLOADS_KEY);
  if (raw && (JSON.parse(raw) as DownloadRecord[]).length > 0) return;

  const now = new Date();
  const daysAgo = (n: number) =>
    new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

  const demoRecords: DownloadRecord[] = [
    {
      id: "dl-demo-1",
      productId: "product-1",
      productTitle: "The Resilient Mind",
      productAuthor: "Dr. Amara Osei",
      productType: "ebook",
      price: 14.99,
      purchasedAt: daysAgo(3),
      lastDownloadedAt: daysAgo(1),
      downloadCount: 2,
    },
    {
      id: "dl-demo-2",
      productId: "product-2",
      productTitle: "Mindful Moments",
      productAuthor: "Lena K. Hart",
      productType: "audiobook",
      price: 9.99,
      purchasedAt: daysAgo(7),
      lastDownloadedAt: daysAgo(5),
      downloadCount: 1,
    },
    {
      id: "dl-demo-3",
      productId: "product-3",
      productTitle: "Wellness Mastery",
      productAuthor: "Dr. Marcus Vega",
      productType: "video",
      price: 24.99,
      purchasedAt: daysAgo(1),
      lastDownloadedAt: null,
      downloadCount: 0,
    },
  ];

  localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(demoRecords));
}

export function getDownloads(): DownloadRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DOWNLOADS_KEY);
    return raw ? (JSON.parse(raw) as DownloadRecord[]) : [];
  } catch {
    return [];
  }
}

function saveDownloads(records: DownloadRecord[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(records));
  }
}

/**
 * Record a download action for a given productId.
 * Call this from the "Buy" flow after a successful purchase.
 */
export function recordDownload(productId: string): void {
  if (typeof window === "undefined") return;
  const records = getDownloads();
  const record = records.find((r) => r.productId === productId);
  if (record) {
    record.downloadCount += 1;
    record.lastDownloadedAt = new Date().toISOString();
  }
  saveDownloads(records);
}
