import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

export class SesProvider implements EmailProvider {
  constructor(
    private readonly accessKeyId: string,
    private readonly secretAccessKey: string,
    private readonly region: string,
  ) {}

  async send(message: EmailMessage): Promise<EmailSendResult> {
    try {
      const client = new SESv2Client({
        region: this.region,
        credentials: { accessKeyId: this.accessKeyId, secretAccessKey: this.secretAccessKey },
      });
      const command = new SendEmailCommand({
        FromEmailAddress: message.from,
        Destination: { ToAddresses: [message.to] },
        ReplyToAddresses: message.replyTo ? [message.replyTo] : undefined,
        Content: {
          Simple: {
            Subject: { Data: message.subject },
            Body: {
              Html: { Data: message.html },
              ...(message.text ? { Text: { Data: message.text } } : {}),
            },
          },
        },
      });
      const result = await client.send(command);
      return { success: true, providerMessageId: result.MessageId };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
}
