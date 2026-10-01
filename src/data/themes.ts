import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { themeSettings, type ThemeSettingsRow } from "~/db/schema";
import { requireAdmin } from "~/lib/requireAdmin";

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

const THEME_SETTINGS_ID = "global";
const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function db() {
  return drizzle(sql());
}

function rowToTheme(row: ThemeSettingsRow): Theme {
  return {
    id: row.themeId,
    name: row.themeName,
    colors: {
      bg: row.colorBg,
      surface: row.colorSurface,
      nav: row.colorNav,
      primary: row.colorPrimary,
      text: row.colorText,
      textMuted: row.colorTextMuted,
      border: row.colorBorder,
    },
  };
}

function themeToValues(theme: Theme) {
  return {
    themeId: theme.id,
    themeName: theme.name,
    colorBg: theme.colors.bg,
    colorSurface: theme.colors.surface,
    colorNav: theme.colors.nav,
    colorPrimary: theme.colors.primary,
    colorText: theme.colors.text,
    colorTextMuted: theme.colors.textMuted,
    colorBorder: theme.colors.border,
  };
}

function isValidTheme(t: Theme): boolean {
  if (!t || typeof t !== "object" || !t.colors) return false;
  if (typeof t.id !== "string" || t.id.length < 1 || t.id.length > 60) return false;
  if (typeof t.name !== "string" || t.name.length < 1 || t.name.length > 60) return false;
  const keys = ["bg", "surface", "nav", "primary", "text", "textMuted", "border"] as const;
  return keys.every((k) => typeof t.colors[k] === "string" && HEX.test(t.colors[k]));
}

async function readOrCreate(): Promise<Theme> {
  const database = db();
  const rows = await database
    .select()
    .from(themeSettings)
    .where(eq(themeSettings.id, THEME_SETTINGS_ID));
  if (rows[0]) return rowToTheme(rows[0]);

  await database
    .insert(themeSettings)
    .values({ id: THEME_SETTINGS_ID, ...themeToValues(defaultTheme) })
    .onConflictDoNothing();
  const again = await database
    .select()
    .from(themeSettings)
    .where(eq(themeSettings.id, THEME_SETTINGS_ID));
  return again[0] ? rowToTheme(again[0]) : defaultTheme;
}

/* ─── Server functions ─── */

export const getStoreTheme = createServerFn({ method: "GET" }).handler(
  async (): Promise<Theme> => readOrCreate(),
);

export const saveStoreTheme = createServerFn({ method: "POST" })
  .validator((theme: Theme) => theme)
  .handler(async ({ data: theme }): Promise<Theme> => {
    await requireAdmin();
    if (!isValidTheme(theme)) return readOrCreate();

    const values = themeToValues(theme);
    await db()
      .insert(themeSettings)
      .values({ id: THEME_SETTINGS_ID, ...values })
      .onConflictDoUpdate({ target: themeSettings.id, set: values });
    return theme;
  });
