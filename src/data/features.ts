export interface Module {
  id: string;
  name: string;
  icon: string;
  description: string;
  locked: boolean;
  enabled: boolean;
}

// ── 4 Core infrastructure modules (locked ON, non-toggleable) ──
export const coreModules: Module[] = [
  {
    id: "storefront-grid",
    name: "Storefront Grid",
    icon: "fa-store",
    description: "Core product listing and display grid engine.",
    locked: true,
    enabled: true,
  },
  {
    id: "branding-profiles",
    name: "Branding Profiles",
    icon: "fa-palette",
    description: "White-label brand identity and theme configuration.",
    locked: true,
    enabled: true,
  },
  {
    id: "local-db-logs",
    name: "Local Database Logs",
    icon: "fa-database",
    description: "Local audit logging and data persistence layer.",
    locked: true,
    enabled: true,
  },
  {
    id: "theme-palettes",
    name: "Theme Palettes",
    icon: "fa-paint-brush",
    description: "Pre-built color schemes and visual theme management.",
    locked: true,
    enabled: true,
  },
];

// ── 10 Premium reactive modules (toggleable) ──
export const premiumModules: Module[] = [
  {
    id: "diagnostic-quiz",
    name: "Diagnostic Quiz",
    icon: "fa-clipboard-list",
    description: "Interactive diagnostic assessments for your audience.",
    locked: false,
    enabled: false,
  },
  {
    id: "daily-sms",
    name: "Daily SMS Engine",
    icon: "fa-sms",
    description: "Automated daily SMS messaging and drip campaigns.",
    locked: false,
    enabled: false,
  },
  {
    id: "ai-chatbot",
    name: "AI Chatbot Companion",
    icon: "fa-robot",
    description: "AI-powered chatbot for customer engagement and support.",
    locked: false,
    enabled: false,
  },
  {
    id: "progress-hub",
    name: "Progress Hub Tracking Matrix",
    icon: "fa-chart-line",
    description: "Track user progress through courses and content paths.",
    locked: false,
    enabled: false,
  },
  {
    id: "upsell-popups",
    name: "Upsell Popups",
    icon: "fa-bolt",
    description: "Smart upsell and cross-sell popup campaigns.",
    locked: false,
    enabled: false,
  },
  {
    id: "affiliate-portal",
    name: "Affiliate Portal",
    icon: "fa-handshake",
    description: "Full affiliate marketing management and tracking.",
    locked: false,
    enabled: false,
  },
  {
    id: "pay-what-you-want",
    name: "Pay-What-You-Want",
    icon: "fa-tag",
    description: "Flexible pricing model with pay-what-you-want options.",
    locked: false,
    enabled: false,
  },
  {
    id: "audiobook-player",
    name: "Audiobook Player",
    icon: "fa-headphones",
    description: "Embedded audiobook player with bookmarking and speed control.",
    locked: false,
    enabled: false,
  },
  {
    id: "community-boards",
    name: "Community Boards",
    icon: "fa-comments",
    description: "Community discussion forums and member boards.",
    locked: false,
    enabled: false,
  },
  {
    id: "abandoned-cart",
    name: "Abandoned Cart Recovery",
    icon: "fa-cart-arrow-down",
    description: "Automated recovery flows for abandoned shopping carts.",
    locked: false,
    enabled: false,
  },
];