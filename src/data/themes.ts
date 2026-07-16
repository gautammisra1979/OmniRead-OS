export interface Theme {
  id: string;
  name: string;
  colors: {
    bg: string;        // body background
    surface: string;   // card/tile background
    nav: string;       // nav bar background
    primary: string;   // buttons, links, accent
    text: string;      // primary text
    textMuted: string; // secondary/gray text
    border: string;    // borders
  };
}

export const presetThemes: Theme[] = [
  {
    id: "midnight-charcoal",
    name: "Midnight Charcoal",
    colors: {
      bg: "#0f172a",
      surface: "#1e293b",
      nav: "#020617",
      primary: "#6366f1",
      text: "#f8fafc",
      textMuted: "#94a3b8",
      border: "#334155",
    },
  },
  {
    id: "zen-mint",
    name: "Zen Mint",
    colors: {
      bg: "#f0fdf4",
      surface: "#ffffff",
      nav: "#166534",
      primary: "#16a34a",
      text: "#1a1a1a",
      textMuted: "#6b7280",
      border: "#d1d5db",
    },
  },
  {
    id: "warm-terracotta",
    name: "Warm Terracotta",
    colors: {
      bg: "#fef2f2",
      surface: "#ffffff",
      nav: "#9a3412",
      primary: "#ea580c",
      text: "#1a1a1a",
      textMuted: "#6b7280",
      border: "#d1d5db",
    },
  },
  {
    id: "ocean-blue",
    name: "Ocean Blue",
    colors: {
      bg: "#f0f9ff",
      surface: "#ffffff",
      nav: "#1e3a5f",
      primary: "#2563eb",
      text: "#1a1a1a",
      textMuted: "#6b7280",
      border: "#d1d5db",
    },
  },
  {
    id: "royal-purple",
    name: "Royal Purple",
    colors: {
      bg: "#faf5ff",
      surface: "#ffffff",
      nav: "#4c1d95",
      primary: "#7c3aed",
      text: "#1a1a1a",
      textMuted: "#6b7280",
      border: "#d1d5db",
    },
  },
];

export const defaultTheme = presetThemes[0]; // Midnight Charcoal