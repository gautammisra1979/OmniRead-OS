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

function rowToPublic(row: EmailSettingsRow): EmailSettingsPublic {
  return {
    provider: (row.provider as EmailProviderId) ?? "resend",
    fromName: row.fromName,
    fromAddress: row.fromAddress,
    resend: { hasApiKey: !!row.resendApiKeyEncrypted },
    postmark: { hasApiKey: !!row.postmarkApiKeyEncrypted },
    ses: {
      accessKeyId: row.sesAccessKeyId ?? "",
      region: row.sesRegion,
      hasSecret: !!row.sesSecretAccessKeyEncrypted,
    },
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
    };
  },
);

const dbSaveEmailSettings = createServerFn({ method: "POST" })
  .validator((input: EmailSettingsInput) => input)
  .handler(async ({ data: input }): Promise<void> => {
    await requireAdmin();
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
  .validator((recipient: string) => recipient)
  .handler(async ({ data: recipient }): Promise<TestEmailResult> => {
    await requireAdmin();
    const { provider, fromName, fromAddress } = await getConfiguredEmailProvider();
    const from = fromName ? `${fromName} <${fromAddress}>` : fromAddress;
    const result = await provider.send({
      to: recipient,
      from,
      subject: "Test email from your admin settings",
      html: "<p>This is a test email confirming your transactional-email provider is configured correctly.</p>",
      text: "This is a test email confirming your transactional-email provider is configured correctly.",
    });
    return { success: result.success, error: result.error };
  });

/* ─── Public API ─── */

export async function getEmailSettings(): Promise<EmailSettingsPublic> {
  return dbGetEmailSettings();
}

export async function saveEmailSettings(input: EmailSettingsInput): Promise<void> {
  return dbSaveEmailSettings({ data: input });
}

export async function sendTestEmail(recipient: string): Promise<TestEmailResult> {
  return dbSendTestEmail({ data: recipient });
}

/** Providers verified enough to appear in the admin dropdown (see EMAIL_PROVIDER_REGISTRY). */
export function getVerifiedProviders(): { id: EmailProviderId; label: string }[] {
  return (Object.keys(EMAIL_PROVIDER_REGISTRY) as EmailProviderId[])
    .filter((id) => EMAIL_PROVIDER_REGISTRY[id].verified)
    .map((id) => ({ id, label: EMAIL_PROVIDER_REGISTRY[id].label }));
}
