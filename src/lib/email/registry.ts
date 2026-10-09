import type { EmailProviderId } from "./types";

/**
 * Which providers are real, store-owner-selectable options. Resend ships live
 * and verified. Postmark, SES, SendGrid and Azure are fully built and
 * type-check cleanly, but stay `verified: false` until each has one real
 * verified test send (see Session 60 Task 5's explicit out-of-scope note).
 * Unverified providers are selectable and saveable on Dev and Preview only
 * (VERCEL_ENV !== "production") so they can be live-tested; on Production only
 * verified providers can be selected or saved, except that the currently saved
 * provider always stays listed (src/data/emailSettings.ts computes
 * `selectableProviders` server-side). Flipping a provider to `verified: true`
 * is the entire follow-up task once that real send is confirmed.
 */
export const EMAIL_PROVIDER_REGISTRY: Record<EmailProviderId, { label: string; verified: boolean }> = {
  resend: { label: "Resend", verified: true },
  postmark: { label: "Postmark", verified: false },
  ses: { label: "Amazon SES", verified: false },
  sendgrid: { label: "SendGrid", verified: false },
  azure: { label: "Azure Communication Services", verified: false },
};
