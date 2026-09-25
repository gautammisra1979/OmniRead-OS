import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { emailSendFailures } from "~/db/schema";
import { getConfiguredEmailProvider } from "./getProvider";
import type { EmailMessage, EmailSendResult } from "./types";

export interface SendEmailParams {
  /** e.g. "password-reset", "magic-link", "contact-us-notification" — logged on failure, not validated against a fixed list. */
  notificationType: string;
  message: EmailMessage;
}

/**
 * Guard-rail wrapper future automatic call sites (password reset,
 * magic-link, Contact Us notification — none wired up yet) will use instead
 * of calling a provider adapter directly. In every environment except real
 * production it logs the would-be send and returns a synthetic success,
 * since `NODE_ENV` is "production" on Vercel preview deploys too and would
 * otherwise send real mail from preview traffic. In real production, it
 * calls the currently-configured provider for real and records any failure
 * to `email_send_failures` before returning it — it only adds logging, it
 * never swallows a failure.
 *
 * The Test Email admin action (src/data/emailSettings.ts) deliberately does
 * NOT go through this wrapper — it calls the adapter directly, since it's an
 * explicit human-triggered verification send that must always attempt
 * delivery regardless of environment.
 */
export async function sendEmail({ notificationType, message }: SendEmailParams): Promise<EmailSendResult> {
  const { provider, providerId, fromName, fromAddress } = await getConfiguredEmailProvider();
  const from = message.from || (fromName ? `${fromName} <${fromAddress}>` : fromAddress);
  const resolvedMessage: EmailMessage = { ...message, from };

  if (process.env.VERCEL_ENV !== "production") {
    console.log(
      `[sendEmail] VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"} — logging instead of sending: ` +
        `to=${resolvedMessage.to} subject="${resolvedMessage.subject}" provider=${providerId}`,
    );
    return { success: true, providerMessageId: "dev-noop" };
  }

  const result = await provider.send(resolvedMessage);

  if (!result.success) {
    await drizzle(sql())
      .insert(emailSendFailures)
      .values({
        notificationType,
        recipient: resolvedMessage.to,
        errorMessage: result.error ?? "Unknown error",
        provider: providerId,
      });
  }

  return result;
}
