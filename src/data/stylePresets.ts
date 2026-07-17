/**
 * Style Presets — Border/Shadow & Typography
 *
 * Provides presets for card styling and typography that extend
 * the theme system. Stored in localStorage.
 */

export type BorderPreset = "sharp" | "rounded" | "elevated";
export type TypographyPreset = "modern" | "classic" | "minimal";

export interface StylePresets {
  border: BorderPreset;
  typography: TypographyPreset;
}

const STYLE_KEY = "omnimedos_style_presets";

const DEFAULT_PRESETS: StylePresets = {
  border: "rounded",
  typography: "modern",
};

export const BORDER_PRESETS: Record<BorderPreset, { name: string; radius: string; shadow: string; ring: string }> = {
  sharp: {
    name: "Sharp",
    radius: "0px",
    shadow: "none",
    ring: "0 0 0 2px",
  },
  rounded: {
    name: "Rounded",
    radius: "12px",
    shadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
    ring: "0 0 0 3px",
  },
  elevated: {
    name: "Elevated",
    radius: "20px",
    shadow: "0 20px 25px -5px rgba(0,0,0,0.2), 0 8px 10px -6px rgba(0,0,0,0.15)",
    ring: "0 0 0 4px",
  },
};

export const TYPOGRAPHY_PRESETS: Record<TypographyPreset, { name: string; fontFamily: string; headingWeight: string; bodySize: string; letterSpacing: string }> = {
  modern: {
    name: "Modern",
    fontFamily: "'Inter', system-ui, sans-serif",
    headingWeight: "700",
    bodySize: "0.875rem",
    letterSpacing: "normal",
  },
  classic: {
    name: "Classic",
    fontFamily: "'Merriweather', 'Georgia', serif",
    headingWeight: "900",
    bodySize: "1rem",
    letterSpacing: "0.01em",
  },
  minimal: {
    name: "Minimal",
    fontFamily: "'Inter', system-ui, sans-serif",
    headingWeight: "300",
    bodySize: "0.8125rem",
    letterSpacing: "0.05em",
  },
};

export function getStylePresets(): StylePresets {
  if (typeof window === "undefined") return { ...DEFAULT_PRESETS };
  try {
    const raw = localStorage.getItem(STYLE_KEY);
    if (raw) return { ...DEFAULT_PRESETS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { ...DEFAULT_PRESETS };
}

export function saveStylePresets(presets: StylePresets): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STYLE_KEY, JSON.stringify(presets));
    // Dispatch event so components can react
    window.dispatchEvent(new CustomEvent("style-presets-changed", { detail: presets }));
  }
}

export function applyStylePresets(presets: StylePresets): void {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  const borderCfg = BORDER_PRESETS[presets.border];
  const typoCfg = TYPOGRAPHY_PRESETS[presets.typography];

  root.style.setProperty("--border-radius", borderCfg.radius);
  root.style.setProperty("--box-shadow", borderCfg.shadow);
  root.style.setProperty("--focus-ring", borderCfg.ring);

  root.style.setProperty("--font-family", typoCfg.fontFamily);
  root.style.setProperty("--heading-weight", typoCfg.headingWeight);
  root.style.setProperty("--body-size", typoCfg.bodySize);
  root.style.setProperty("--letter-spacing", typoCfg.letterSpacing);
}

/* ─── Announcement Bar Config ─── */

export interface AnnouncementConfig {
  enabled: boolean;
  text: string;
  type: "info" | "sale" | "shipping" | "warning";
  dismissible: boolean;
  linkUrl: string;
  linkText: string;
  shippingThreshold: number; // free shipping threshold in $
  shippingMessage: string;
}

const ANNOUNCEMENT_KEY = "omnimedos_announcement";

const DEFAULT_ANNOUNCEMENT: AnnouncementConfig = {
  enabled: true,
  text: "Free shipping on orders over $50!",
  type: "shipping",
  dismissible: true,
  linkUrl: "",
  linkText: "Learn More",
  shippingThreshold: 50,
  shippingMessage: "Free shipping on orders over ${threshold}!",
};

export function getAnnouncementConfig(): AnnouncementConfig {
  if (typeof window === "undefined") return { ...DEFAULT_ANNOUNCEMENT };
  try {
    const raw = localStorage.getItem(ANNOUNCEMENT_KEY);
    if (raw) return { ...DEFAULT_ANNOUNCEMENT, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { ...DEFAULT_ANNOUNCEMENT };
}

export function saveAnnouncementConfig(config: AnnouncementConfig): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(ANNOUNCEMENT_KEY, JSON.stringify(config));
  }
}