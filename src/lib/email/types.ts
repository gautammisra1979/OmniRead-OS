/**
 * Provider-agnostic transactional email contract. Every adapter
 * (resend.ts, postmark.ts, ses.ts) implements this so call sites never see
 * provider-specific shapes or exceptions — send() always resolves, never
 * throws, and normalizes failures into { success: false, error }.
 */

export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  success: boolean;
  error?: string;
  providerMessageId?: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

export type EmailProviderId = "resend" | "postmark" | "ses";
