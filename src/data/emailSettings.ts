import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { emailSettings, type EmailSettingsRow } from "~/db/schema";
import { requireAdmin } from "~/lib/requireAdmin";
import { encryptRecoveryPhrase } from "~/lib/recoveryCrypto";
import { getConfiguredEmailProvider } from "~/lib/email/getProvider";
import { EMAIL_PROVIDER_REGISTRY } from "~/lib/email/registry";
import type { EmailProviderId } from "~/lib/email/types";
import { resolveLocale } from "~/lib/i18n";
import { buildTestEmail } from "~/lib/email/templates/testEmail";

/**
 * Single global, admin-managed transactional-email settings row — same
 * lazy-init pattern as affiliateSettings.ts, with two deliberate
 * differences (Session 60 Task 4): the read is admin-gated and never
 * returns secrets (booleans only), and secrets are AES-GCM encrypted at
 * rest via recoveryCrypto.ts, decrypted only inside the adapter call path
 * (src/lib/email/getProvider.ts), never here.
 */

const EMAIL_SETTINGS_ID = "global";

export interface EmailSettingsPublic {
  provider: EmailProviderId;
  fromName: string;
  fromAddress: string;
  resend: { hasApiKey: boolean };
  postmark: { hasApiKey: boolean };
  ses: { accessKeyId: string; region: string; hasSecret: boolean };
  sendgrid: { hasApiKey: boolean; region: "global" | "eu" };
  azure: { hasConnectionString: boolean };
  selectableProviders: { id: EmailProviderId; label: string; verified: boolean }[];
}

export interface EmailSettingsInput {
  provider: EmailProviderId;
  fromName: string;
  fromAddress: string;
  /** Blank/omitted means "keep the existing stored value." */
  resendApiKey?: string;
  postmarkApiKey?: string;
  sesAccessKeyId?: string;
  /** Blank/omitted means "keep the existing stored value." */
  sesSecretAccessKey?: string;
  sesRegion?: string;
  sendgridApiKey?: string;
  sendgridRegion?: string;
  azureConnectionString?: string;
}

export interface TestEmailInput {
  recipient: string;
  locale: string;
}

export interface TestEmailResult {
  success: boolean;
  error?: string;
}

const DEFAULT_ROW = {
  provider: "resend" as EmailProviderId,
  fromName: "",
  fromAddress: "",
  sesRegion: "us-east-1",
};

function db() {
  return drizzle(sql());
}

/**
 * Production offers verified providers only; Dev/Preview offer all. The saved
 * provider is always included so the dropdown never misrepresents it.
 */
function computeSelectableProviders(saved: EmailProviderId): EmailSettingsPublic["selectableProviders"] {
  const isProduction = process.env.VERCEL_ENV === "production";
  return (Object.keys(EMAIL_PROVIDER_REGISTRY) as EmailProviderId[])
    .filter((id) => !isProduction || EMAIL_PROVIDER_REGISTRY[id].verified || id === saved)
    .map((id) => ({ id, label: EMAIL_PROVIDER_REGISTRY[id].label, verified: EMAIL_PROVIDER_REGISTRY[id].verified }));
}

function rowToPublic(row: EmailSettingsRow): EmailSettingsPublic {
  const provider = (row.provider as EmailProviderId) ?? "resend";
  return {
    provider,
    fromName: row.fromName,
    fromAddress: row.fromAddress,
    resend: { hasApiKey: !!row.resendApiKeyEncrypted },
    postmark: { hasApiKey: !!row.postmarkApiKeyEncrypted },
    ses: {
      accessKeyId: row.sesAccessKeyId ?? "",
      region: row.sesRegion,
      hasSecret: !!row.sesSecretAccessKeyEncrypted,
    },
    sendgrid: { hasApiKey: !!row.sendgridApiKeyEncrypted, region: row.sendgridRegion === "eu" ? "eu" : "global" },
    azure: { hasConnectionString: !!row.azureConnectionStringEncrypted },
    selectableProviders: computeSelectableProviders(provider),
  };
}

/* ─── Internal server functions ─── */

const dbGetEmailSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<EmailSettingsPublic> => {
    await requireAdmin();
    const database = db();
    const rows = await database.select().from(emailSettings).where(eq(emailSettings.id, EMAIL_SETTINGS_ID));
    if (rows[0]) return rowToPublic(rows[0]);

    await database
      .insert(emailSettings)
      .values({ id: EMAIL_SETTINGS_ID, ...DEFAULT_ROW })
      .onConflictDoNothing();
    return {
      provider: DEFAULT_ROW.provider,
      fromName: DEFAULT_ROW.fromName,
      fromAddress: DEFAULT_ROW.fromAddress,
      resend: { hasApiKey: false },
      postmark: { hasApiKey: false },
      ses: { accessKeyId: "", region: DEFAULT_ROW.sesRegion, hasSecret: false },
      sendgrid: { hasApiKey: false, region: "global" },
      azure: { hasConnectionString: false },
      selectableProviders: computeSelectableProviders(DEFAULT_ROW.provider),
    };
  },
);

const dbSaveEmailSettings = createServerFn({ method: "POST" })
  .validator((input: EmailSettingsInput) => input)
  .handler(async ({ data: input }): Promise<void> => {
    await requireAdmin();

    // Defense-in-depth: unverified providers are selectable on Dev/Preview
    // only. On Production the server function itself refuses them, so a
    // provider only reaches the live config once it has a real smoke-tested
    // send behind it (Session 58's staged-verification design).
    if (!EMAIL_PROVIDER_REGISTRY[input.provider]) {
      throw new Error(`Unknown email provider "${input.provider}".`);
    }
    if (input.sendgridRegion !== undefined && input.sendgridRegion !== "global" && input.sendgridRegion !== "eu") {
      throw new Error('SendGrid region must be "global" or "eu".');
    }
    if (process.env.VERCEL_ENV === "production" && !EMAIL_PROVIDER_REGISTRY[input.provider].verified) {
      throw new Error(
        `"${EMAIL_PROVIDER_REGISTRY[input.provider]?.label ?? input.provider}" has not been verified yet and cannot be selected as the active email provider.`,
      );
    }

    const database = db();
    const existingRows = await database.select().from(emailSettings).where(eq(emailSettings.id, EMAIL_SETTINGS_ID));
    const existing = existingRows[0];

    const resendApiKeyEncrypted = input.resendApiKey
      ? await encryptRecoveryPhrase(input.resendApiKey)
      : (existing?.resendApiKeyEncrypted ?? null);
    const postmarkApiKeyEncrypted = input.postmarkApiKey
      ? await encryptRecoveryPhrase(input.postmarkApiKey)
      : (existing?.postmarkApiKeyEncrypted ?? null);
    const sesSecretAccessKeyEncrypted = input.sesSecretAccessKey
      ? await encryptRecoveryPhrase(input.sesSecretAccessKey)
      : (existing?.sesSecretAccessKeyEncrypted ?? null);
    const sendgridApiKeyEncrypted = input.sendgridApiKey
      ? await encryptRecoveryPhrase(input.sendgridApiKey)
      : (existing?.sendgridApiKeyEncrypted ?? null);
    const azureConnectionStringEncrypted = input.azureConnectionString
      ? await encryptRecoveryPhrase(input.azureConnectionString)
      : (existing?.azureConnectionStringEncrypted ?? null);

    const values = {
      id: EMAIL_SETTINGS_ID,
      provider: input.provider,
      fromName: input.fromName,
      fromAddress: input.fromAddress,
      resendApiKeyEncrypted,
      postmarkApiKeyEncrypted,
      sesAccessKeyId: input.sesAccessKeyId ?? existing?.sesAccessKeyId ?? null,
      sesSecretAccessKeyEncrypted,
      sesRegion: input.sesRegion ?? existing?.sesRegion ?? DEFAULT_ROW.sesRegion,
      sendgridApiKeyEncrypted,
      sendgridRegion: input.sendgridRegion ?? existing?.sendgridRegion ?? "global",
      azureConnectionStringEncrypted,
    };

    await database
      .insert(emailSettings)
      .values(values)
      .onConflictDoUpdate({ target: emailSettings.id, set: values });
  });

/**
 * Explicit human-triggered verification send — this is the store owner's
 * only signal that DNS/API-key/credentials are actually working, so it
 * calls the adapter directly (never sendEmail()'s wrapper) and always
 * attempts real delivery regardless of VERCEL_ENV.
 */
const dbSendTestEmail = createServerFn({ method: "POST" })
  .validator((input: TestEmailInput) => input)
  .handler(async ({ data: input }): Promise<TestEmailResult> => {
    await requireAdmin();
    const { provider, providerId, fromName, fromAddress } = await getConfiguredEmailProvider();
    const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
    const { subject, html, text } = buildTestEmail({
      locale: resolveLocale(input.locale),
      storeName: fromName || fromAddress,
      providerLabel: EMAIL_PROVIDER_REGISTRY[providerId].label,
    });
    const result = await provider.send({ to: input.recipient, from, subject, html, text });
    return { success: result.success, error: result.error };
  });

/* ─── Public API ─── */

export async function getEmailSettings(): Promise<EmailSettingsPublic> {
  return dbGetEmailSettings();
}

export async function saveEmailSettings(input: EmailSettingsInput): Promise<void> {
  return dbSaveEmailSettings({ data: input });
}

export async function sendTestEmail(input: TestEmailInput): Promise<TestEmailResult> {
  return dbSendTestEmail({ data: input });
}
