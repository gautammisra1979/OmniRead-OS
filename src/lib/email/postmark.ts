import { ServerClient } from "postmark";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

export class PostmarkProvider implements EmailProvider {
  constructor(private readonly apiKey: string) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const client = new ServerClient(this.apiKey);
      const result = await client.sendEmail({
        From: message.from,
        To: message.to,
        Subject: message.subject,
        HtmlBody: message.html,
        TextBody: message.text,
        ReplyTo: message.replyTo,
      });
      // sendEmail() normally rejects on API-level errors (invalid key, etc.)
      // rather than resolving with a non-zero ErrorCode, but this is checked
      // defensively since the client's own types don't guarantee it.
      if (result.ErrorCode !== 0) {
        return { success: false, error: result.Message };
      }
      return { success: true, providerMessageId: result.MessageID };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
