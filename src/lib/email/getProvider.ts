import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { emailSettings } from "~/db/schema";
import { decryptRecoveryPhrase } from "~/lib/recoveryCrypto";
import { ResendProvider } from "./resend";
import { PostmarkProvider } from "./postmark";
import { SesProvider } from "./ses";
import type { EmailProvider, EmailProviderId } from "./types";

const EMAIL_SETTINGS_ID = "global";

export interface ConfiguredEmailProvider {
  provider: EmailProvider;
  providerId: EmailProviderId;
  fromName: string;
  fromAddress: string;
}

/**
 * Server-only: reads the current email-config row, decrypts whichever
 * secret the configured provider needs, and constructs the matching
 * adapter. This is the one place secrets are decrypted — never in the
 * admin-facing GET (src/data/emailSettings.ts's dbGetEmailSettings).
 * Must only be called from within a createServerFn handler or another
 * server-only module; never imported by a client component directly.
 */
export async function getConfiguredEmailProvider(): Promise<ConfiguredEmailProvider> {
  const database = drizzle(sql());
  const rows = await database.select().from(emailSettings).where(eq(emailSettings.id, EMAIL_SETTINGS_ID));
  const row = rows[0];

  const providerId = (row?.provider as EmailProviderId | undefined) ?? "resend";
  const fromName = row?.fromName ?? "";
  const fromAddress = row?.fromAddress ?? "";

  switch (providerId) {
    case "postmark": {
      const apiKey = row?.postmarkApiKeyEncrypted ? await decryptRecoveryPhrase(row.postmarkApiKeyEncrypted) : null;
      return { provider: new PostmarkProvider(apiKey ?? ""), providerId, fromName, fromAddress };
    }
    case "ses": {
      const secretAccessKey = row?.sesSecretAccessKeyEncrypted
        ? await decryptRecoveryPhrase(row.sesSecretAccessKeyEncrypted)
        : null;
      return {
        provider: new SesProvider(row?.sesAccessKeyId ?? "", secretAccessKey ?? "", row?.sesRegion ?? "us-east-1"),
        providerId,
        fromName,
        fromAddress,
      };
    }
    case "resend":
    default: {
      const apiKey = row?.resendApiKeyEncrypted ? await decryptRecoveryPhrase(row.resendApiKeyEncrypted) : null;
      return { provider: new ResendProvider(apiKey ?? ""), providerId: "resend", fromName, fromAddress };
    }
  }
}
