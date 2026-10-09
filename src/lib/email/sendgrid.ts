import { Client } from "@sendgrid/client";
import { MailService } from "@sendgrid/mail";
import { parseAddress } from "./address";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

export class SendGridProvider implements EmailProvider {
  constructor(
    private readonly apiKey: string,
    private readonly region: "global" | "eu",
  ) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      // Fresh client per send: never the package's default singleton or its
      // global API key.
      const client = new Client();
      client.setApiKey(this.apiKey);
      if (this.region === "eu") client.setDataResidency("eu");
      const mail = new MailService();
      mail.setClient(client);

      const from = parseAddress(message.from);
      const [response] = await mail.send({
        from: from.name ? { email: from.address, name: from.name } : { email: from.address },
        to: message.to,
        subject: message.subject,
        html: message.html,
        ...(message.text ? { text: message.text } : {}),
        ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      });
      const id = response.headers?.["x-message-id"];
      return { success: true, providerMessageId: typeof id === "string" ? id : undefined };
    } catch (err) {
      const body = (err as { response?: { body?: { errors?: { message?: string }[] } } })?.response?.body;
      const first = body && typeof body === "object" ? body.errors?.[0]?.message : undefined;
      const text = first || (err instanceof Error ? err.message : String(err));
      return { success: false, error: this.apiKey ? text.split(this.apiKey).join("[redacted]") : text };
    }
  }
}
