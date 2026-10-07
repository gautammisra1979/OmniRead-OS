export type CatalogStatus = "live" | "coming-soon" | "retired";

export interface CatalogItem {
  id: string;
  title: string;
  author: string;
  price: number;
  type: "ebook" | "audiobook" | "video";
  format: string; // "PDF E-Book", "MP3 Audiobook", "MP4 Video Guide"
  description: string;
  coverImage: string | null; // public cover URL built from the stored cover key
  mediaFile: {
    name: string;
    hasFile: boolean; // whether a private media file exists; the key never reaches the browser
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
