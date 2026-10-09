import { randomUUID } from "node:crypto";
import { EmailClient } from "@azure/communication-email";
import { parseAddress } from "./address";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

const INVALID_CONNECTION_STRING =
  "Invalid Azure connection string format. Expected endpoint=https://...;accesskey=...";

/** Strips the connection string and its accesskey value from SDK error text. */
function redact(text: string, connectionString: string): string {
  let out = text;
  if (connectionString) out = out.split(connectionString).join("[redacted]");
  return out.replace(/accesskey=[^;]*/gi, "[redacted]");
}

export class AzureEmailProvider implements EmailProvider {
  constructor(private readonly connectionString: string) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    // Construction throws on a malformed connection string, and the SDK's
    // message embeds the full value, so it is never passed on.
    let client: EmailClient;
    try {
      client = new EmailClient(this.connectionString);
    } catch {
      return { success: false, error: INVALID_CONNECTION_STRING };
    }

    try {
      // Azure takes no per-message display name; it is configured on the sender in Azure.
      const operationId = randomUUID();
      await client.beginSend(
        {
          senderAddress: parseAddress(message.from).address,
          content: {
            subject: message.subject,
            html: message.html,
            ...(message.text ? { plainText: message.text } : {}),
          },
          recipients: { to: [{ address: message.to }] },
          ...(message.replyTo ? { replyTo: [{ address: message.replyTo }] } : {}),
        },
        { operationId },
      );
      // Request accepted. Deliberately no pollUntilDone(): callers must not wait on final delivery.
      return { success: true, providerMessageId: operationId };
    } catch (err) {
      return { success: false, error: redact(err instanceof Error ? err.message : String(err), this.connectionString) };
    }
  }
}
