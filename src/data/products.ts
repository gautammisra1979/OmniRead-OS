import { getCatalogItems, type CatalogItem } from "./catalog";
import { calculateDiscountedPrice, getPromoSettings } from "./promotions";

export interface Product {
  id: string;
  title: string;
  author: string;
  description: string;
  price: number;
  displayPrice?: number;
  hasDiscount?: boolean;
  format: string;
  type: "ebook" | "audiobook" | "video";
  coverFrom?: string;
  coverTo?: string;
  coverIcon?: string;
  coverImage?: string | null;
  quizMood?: string[];
  quizFormat?: string[];
  quizHook?: string[];
  quizPace?: string[];
  status?: "live" | "coming-soon" | "retired";
  rating?: number;
  reviewCount?: number;
}

export const products: Product[] = [
  {
    id: "product-1",
    title: "The Resilient Mind",
    author: "Dr. Amara Osei",
    description:
      "A transformative guide to building mental toughness and emotional agility in a fast-paced world. Packed with actionable exercises and real-world stories.",
    price: 14.99,
    format: "PDF E-Book",
    type: "ebook",
    coverFrom: "from-emerald-500",
    coverTo: "to-green-700",
    coverIcon: "🧠",
    quizMood: ["empowering", "thoughtful"],
    quizFormat: ["guided_exercises", "case_studies"],
    quizHook: ["personal_growth", "resilience"],
    quizPace: ["weekly_chapters", "self_paced"],
  },
  {
    id: "product-2",
    title: "Mindful Moments",
    author: "Lena K. Hart",
    description:
      "A soothing audio journey through 15 guided meditations designed to reduce stress, improve focus, and cultivate inner peace — anywhere, anytime.",
    price: 9.99,
    format: "MP3 Audiobook",
    type: "audiobook",
    coverFrom: "from-purple-500",
    coverTo: "to-violet-700",
    coverIcon: "🎵",
    quizMood: ["calming", "reflective"],
    quizFormat: ["guided_narratives", "audio_exercises"],
    quizHook: ["meditation", "stress_relief"],
    quizPace: ["daily_sessions", "self_paced"],
  },
  {
    id: "product-3",
    title: "Wellness Mastery",
    author: "Dr. Marcus Vega",
    description:
      "A complete video course covering nutrition, movement, sleep optimization, and mental wellness. 20+ hours of science-backed content with downloadable resources.",
    price: 24.99,
    format: "MP4 Video Guide",
    type: "video",
    coverFrom: "from-rose-500",
    coverTo: "to-pink-700",
    coverIcon: "🎥",
    quizMood: ["motivational", "educational"],
    quizFormat: ["video_lessons", "workbooks"],
    quizHook: ["health_optimization", "science_backed"],
    quizPace: ["structured_course", "weekly_chapters"],
  },
];

export function getAllProducts(): Product[] {
  const staticProducts = products;
  const catalogItems = getCatalogItems();
  const settings = getPromoSettings();
  const mapped: Product[] = catalogItems.map((item: CatalogItem) => {
    const { discounted, hasDiscount } = calculateDiscountedPrice(item.price, item.promoOverride, settings, item.type);
    return {
      id: item.id,
      title: item.title,
      author: item.author,
      description: item.description,
      price: item.price,
      displayPrice: hasDiscount ? discounted : undefined,
      hasDiscount: hasDiscount,
      format: item.format,
      type: item.type,
      coverFrom: item.coverImage ? undefined : "from-indigo-500",
      coverTo: item.coverImage ? undefined : "to-purple-700",
      coverIcon: item.coverImage ? undefined : "📦",
      coverImage: item.coverImage,
      quizMood: item.quizMood,
      quizFormat: item.quizFormat,
      quizHook: item.quizHook,
      quizPace: item.quizPace,
      status: item.status,
      rating: item.rating,
      reviewCount: item.reviewCount,
    };
  });
  // Filter retired items, then merge with static products
  const all = [...staticProducts.map(applyDiscount), ...mapped];
  return all.filter((p) => p.status !== "retired");
}

function applyDiscount(product: Product): Product {
  const settings = getPromoSettings();
  const { discounted, hasDiscount } = calculateDiscountedPrice(product.price, null, settings, product.type);
  return { ...product, displayPrice: hasDiscount ? discounted : undefined, hasDiscount: hasDiscount };
}