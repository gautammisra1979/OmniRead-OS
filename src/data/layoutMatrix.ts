/**
 * Storefront Layout Matrix — Data Layer
 *
 * Manages layout selection and featured product configuration
 * persisted in localStorage.
 */

import type { CatalogItem } from "~/data/catalog";

export type LayoutType = "classic" | "spotlight" | "magazine";

const LAYOUT_KEY = "omnimedos_active_layout";
const FEATURED_KEY = "omnimedos_featured_product";

export function getActiveLayout(): LayoutType {
  if (typeof window === "undefined") return "magazine";
  const stored = localStorage.getItem(LAYOUT_KEY);
  if (stored === "classic" || stored === "spotlight" || stored === "magazine") return stored;
  return "magazine";
}

export function setActiveLayout(layout: LayoutType): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(LAYOUT_KEY, layout);
  }
}

export function getFeaturedProductId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(FEATURED_KEY);
}

export function setFeaturedProductId(id: string | null): void {
  if (typeof window !== "undefined") {
    if (id) {
      localStorage.setItem(FEATURED_KEY, id);
    } else {
      localStorage.removeItem(FEATURED_KEY);
    }
  }
}

export function getLatestCatalogItem(items: CatalogItem[]): CatalogItem | null {
  if (items.length === 0) return null;
  return items[items.length - 1];
}