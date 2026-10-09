import type { Locale } from "~/data/translations";
import { translate } from "~/lib/i18n";
import { escapeHtml } from "./escapeHtml";

export interface TestEmailParams {
  locale: Locale;
  storeName: string;
  providerLabel: string;
}

export function buildTestEmail({ locale, storeName, providerLabel }: TestEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const vars = { store: storeName.trim(), provider: providerLabel };
  const subject = translate(locale, "email.test.subject", vars);
  const heading = translate(locale, "email.test.heading", vars);
  const body = translate(locale, "email.test.body", vars);

  const html =
    `<!doctype html><html lang="${escapeHtml(locale)}"><body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111827;background:#ffffff;">` +
    `<h1 style="font-size:20px;margin:0 0 16px;">${escapeHtml(heading)}</h1>` +
    `<p style="font-size:15px;line-height:1.5;margin:0;">${escapeHtml(body)}</p>` +
    `</body></html>`;

  const text = [heading, "", body].join("\n");

  return { subject, html, text };
}
