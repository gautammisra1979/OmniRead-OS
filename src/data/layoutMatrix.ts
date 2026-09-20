/**
 * Storefront Layout Matrix — Data Layer
 *
 * LayoutType and getLatestCatalogItem live here; layout selection and
 * featured-product persistence are DB-backed now — see
 * getStorefrontLayout/updateStorefrontLayout in src/db/queries.ts.
 */

import type { CatalogItem } from "~/data/catalog";

export type LayoutType = "classic" | "spotlight" | "magazine";

export function getLatestCatalogItem(items: CatalogItem[]): CatalogItem | null {
  if (items.length === 0) return null;
  return items[items.length - 1];
}