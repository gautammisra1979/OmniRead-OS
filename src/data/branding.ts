import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { brandingSettings, type BrandingSettingsRow } from "~/db/schema";
import { requireAdmin } from "~/lib/requireAdmin";
import { getStorage } from "~/lib/storage";
import { isGeneratedKey } from "~/lib/storage/keys";

export interface BrandingConfig {
  storeName: string;
  supportEmail: string;
  socialLinks: {
    twitter: string;
    instagram: string;
    tiktok: string;
  };
  logoKey: string | null; // persisted provider-neutral storage key
  logoUrl: string | null; // read-only display URL, derived on the server from logoKey
}

export const defaultBranding: BrandingConfig = {
  storeName: "OmniMedia OS",
  supportEmail: "support@omnimedios.com",
  socialLinks: {
    twitter: "",
    instagram: "",
    tiktok: "",
  },
  logoKey: null,
  logoUrl: null,
};

const BRANDING_SETTINGS_ID = "global";

function db() {
  return drizzle(sql());
}

function rowToConfig(row: BrandingSettingsRow): BrandingConfig {
  return {
    storeName: row.storeName,
    supportEmail: row.supportEmail,
    socialLinks: {
      twitter: row.socialTwitter,
      instagram: row.socialInstagram,
      tiktok: row.socialTiktok,
    },
    logoKey: row.logoKey,
    logoUrl: row.logoKey ? getStorage().publicUrl(row.logoKey) : null,
  };
}

function isHttpUrl(value: string, protocols: string[]): boolean {
  try {
    return protocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function isValidSocial(value: unknown): boolean {
  if (typeof value !== "string") return false;
  if (value === "") return true;
  return value.length <= 500 && isHttpUrl(value, ["http:", "https:"]);
}

function isValidBranding(c: BrandingConfig): boolean {
  if (!c || typeof c !== "object" || !c.socialLinks) return false;
  if (typeof c.storeName !== "string") return false;
  const name = c.storeName.trim();
  if (name.length < 1 || name.length > 60) return false;
  if (typeof c.supportEmail !== "string") return false;
  if (c.supportEmail !== "") {
    if (c.supportEmail.length > 254) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.supportEmail)) return false;
  }
  if (
    !isValidSocial(c.socialLinks.twitter) ||
    !isValidSocial(c.socialLinks.instagram) ||
    !isValidSocial(c.socialLinks.tiktok)
  ) {
    return false;
  }
  if (c.logoKey !== null && !isGeneratedKey("logos", c.logoKey)) return false;
  return true;
}

async function readOrCreate(): Promise<BrandingConfig> {
  const database = db();
  const rows = await database
    .select()
    .from(brandingSettings)
    .where(eq(brandingSettings.id, BRANDING_SETTINGS_ID));
  if (rows[0]) return rowToConfig(rows[0]);

  await database
    .insert(brandingSettings)
    .values({
      id: BRANDING_SETTINGS_ID,
      storeName: defaultBranding.storeName,
      supportEmail: defaultBranding.supportEmail,
      socialTwitter: defaultBranding.socialLinks.twitter,
      socialInstagram: defaultBranding.socialLinks.instagram,
      socialTiktok: defaultBranding.socialLinks.tiktok,
      logoKey: defaultBranding.logoKey,
    })
    .onConflictDoNothing();
  // Re-read so a concurrent first insert wins consistently.
  const again = await database
    .select()
    .from(brandingSettings)
    .where(eq(brandingSettings.id, BRANDING_SETTINGS_ID));
  return again[0] ? rowToConfig(again[0]) : defaultBranding;
}

/* ─── Server functions ─── */

export const getBranding = createServerFn({ method: "GET" }).handler(
  async (): Promise<BrandingConfig> => readOrCreate(),
);

export const saveBranding = createServerFn({ method: "POST" })
  .validator((config: BrandingConfig) => config)
  .handler(async ({ data: config }): Promise<BrandingConfig> => {
    await requireAdmin();
    if (!isValidBranding(config)) return readOrCreate();

    const values = {
      storeName: config.storeName.trim(),
      supportEmail: config.supportEmail,
      socialTwitter: config.socialLinks.twitter,
      socialInstagram: config.socialLinks.instagram,
      socialTiktok: config.socialLinks.tiktok,
      logoKey: config.logoKey,
    };
    await db()
      .insert(brandingSettings)
      .values({ id: BRANDING_SETTINGS_ID, ...values })
      .onConflictDoUpdate({ target: brandingSettings.id, set: values });
    return {
      ...config,
      storeName: values.storeName,
      logoUrl: values.logoKey ? getStorage().publicUrl(values.logoKey) : null,
    };
  });
