import { Resend } from "resend";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

export class ResendProvider implements EmailProvider {
  constructor(private readonly apiKey: string) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const resend = new Resend(this.apiKey);
      const { data, error } = await resend.emails.send({
        from: message.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, providerMessageId: data?.id };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
