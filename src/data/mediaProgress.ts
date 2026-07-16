export interface MediaProgress {
  productId: string;
  currentTime: number;
  duration: number;
  lastUpdated: string;
}

function getKey(productId: string): string {
  return `omnimedia_media_progress_${productId}`;
}

export function getMediaProgress(productId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(getKey(productId));
    if (raw) {
      const data = JSON.parse(raw) as MediaProgress;
      return data.currentTime;
    }
  } catch {
    /* ignore */
  }
  return 0;
}

export function saveMediaProgress(productId: string, currentTime: number, duration: number): void {
  if (typeof window === "undefined") return;
  const data: MediaProgress = { productId, currentTime, duration, lastUpdated: new Date().toISOString() };
  localStorage.setItem(getKey(productId), JSON.stringify(data));
}

export function clearMediaProgress(productId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getKey(productId));
}