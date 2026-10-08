import type { Locale } from "~/data/translations";
import { translate } from "~/lib/i18n";

export interface MagicLinkEmailParams {
  locale: Locale;
  storeName: string;
  link: string;
  minutes: number;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fallbackStoreName(): string {
  try {
    return new URL(process.env.BETTER_AUTH_URL ?? "").host;
  } catch {
    return "";
  }
}

export function buildMagicLinkEmail({ locale, storeName, link, minutes }: MagicLinkEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const store = storeName.trim() || fallbackStoreName();
  const vars = { store, minutes };
  const subject = translate(locale, "email.magicLink.subject", vars);
  const heading = translate(locale, "email.magicLink.heading", vars);
  const body = translate(locale, "email.magicLink.body", vars);
  const button = translate(locale, "email.magicLink.button");
  const fallback = translate(locale, "email.magicLink.fallback");
  const ignore = translate(locale, "email.magicLink.ignore");

  const safeLink = escapeHtml(link);
  const html =
    `<!doctype html><html lang="${escapeHtml(locale)}"><body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111827;background:#ffffff;">` +
    `<h1 style="font-size:20px;margin:0 0 16px;">${escapeHtml(heading)}</h1>` +
    `<p style="font-size:15px;line-height:1.5;margin:0 0 24px;">${escapeHtml(body)}</p>` +
    `<p style="margin:0 0 24px;"><a href="${safeLink}" style="display:inline-block;padding:12px 24px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px;">${escapeHtml(button)}</a></p>` +
    `<p style="font-size:13px;line-height:1.5;color:#4b5563;margin:0 0 8px;">${escapeHtml(fallback)}</p>` +
    `<p style="font-size:13px;line-height:1.5;word-break:break-all;margin:0 0 24px;"><a href="${safeLink}" style="color:#2563eb;">${safeLink}</a></p>` +
    `<p style="font-size:13px;line-height:1.5;color:#4b5563;margin:0;">${escapeHtml(ignore)}</p>` +
    `</body></html>`;

  const text = [heading, "", body, "", link, "", ignore].join("\n");

  return { subject, html, text };
}
