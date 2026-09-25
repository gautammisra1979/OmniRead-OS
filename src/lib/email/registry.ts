import type { EmailProviderId } from "./types";

/**
 * Which providers are real, store-owner-selectable options today. Resend
 * ships live and enabled; Postmark and SES are fully built and type-check
 * cleanly, but stay `verified: false` — and therefore hidden from the admin
 * dropdown (src/components/EmailSettings.tsx) — until each has one real
 * verified test send (see Session 60 Task 5's explicit out-of-scope note).
 * Flipping a provider to `verified: true` is the entire follow-up task once
 * that real send is confirmed.
 */
export const EMAIL_PROVIDER_REGISTRY: Record<EmailProviderId, { label: string; verified: boolean }> = {
  resend: { label: "Resend", verified: true },
  postmark: { label: "Postmark", verified: false },
  ses: { label: "Amazon SES", verified: false },
};
