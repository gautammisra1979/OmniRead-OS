import { useLanguage } from "~/components/LanguageProvider";
import { useBranding } from "~/components/BrandingProvider";

const socialIcons: Record<string, { path: string; label: string }> = {
  twitter: {
    label: "X (Twitter)",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  instagram: {
    label: "Instagram",
    path: "M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.11 2.525c.636-.247 1.363-.416 2.427-.465C8.83 2.013 9.185 2 11.615 2h.7zm-.08 1.802h-.46c-2.397 0-2.684.01-3.634.052-.847.038-1.307.18-1.613.299a2.9 2.9 0 00-1.074.7 2.9 2.9 0 00-.7 1.074c-.118.306-.26.766-.298 1.613-.043.95-.052 1.237-.052 3.634v.46c0 2.397.01 2.684.052 3.634.037.847.18 1.307.299 1.613.156.405.387.77.699 1.074.305.312.67.543 1.074.7.306.118.766.26 1.613.298.95.043 1.237.052 3.634.052h.46c2.397 0 2.684-.01 3.634-.052.847-.038 1.307-.18 1.613-.298.404-.157.77-.388 1.074-.7.312-.304.543-.67.7-1.074.118-.306.26-.766.298-1.613.043-.95.052-1.237.052-3.634v-.46c0-2.397-.01-2.684-.052-3.634-.038-.847-.18-1.307-.299-1.613a2.9 2.9 0 00-.7-1.074 2.9 2.9 0 00-1.074-.7c-.306-.118-.766-.26-1.613-.298-.95-.043-1.237-.052-3.634-.052zm0 4.73a4.545 4.545 0 110 9.09 4.545 4.545 0 010-9.09zm0 1.802a2.743 2.743 0 100 5.486 2.743 2.743 0 000-5.486zm5.396-3.423a1.067 1.067 0 110 2.134 1.067 1.067 0 010-2.134z",
  },
  tiktok: {
    label: "TikTok",
    path: "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  },
};

export function Footer() {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();
  const { branding } = useBranding();
  const hasLogo = branding.logoDataUrl && branding.logoDataUrl.trim().length > 0;

  const activeSocials = (["twitter", "instagram", "tiktok"] as const)
    .filter((platform) => branding.socialLinks[platform]?.trim().length > 0)
    .map((platform) => ({
      platform,
      url: branding.socialLinks[platform]!,
      ...socialIcons[platform],
    }));

  return (
    <footer
      className="border-t"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
      role="contentinfo"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 sm:flex-row">
          <div className="flex flex-col items-center gap-3 sm:items-start">
            <a
              href="/"
              className="flex items-center gap-2 text-lg font-bold"
              style={{ color: "var(--color-text)" }}
            >
              {hasLogo ? (
                <img
                  src={branding.logoDataUrl}
                  alt={branding.storeName}
                  className="h-7 w-auto rounded object-contain"
                />
              ) : (
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  {branding.storeName.charAt(0).toUpperCase()}
                </span>
              )}
              {branding.storeName}
            </a>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              &copy; {currentYear} {branding.storeName}. {t("footer.copyright")}
            </p>
            {branding.supportEmail && (
              <a
                href={`mailto:${branding.supportEmail}`}
                className="text-xs transition-colors hover:opacity-80"
                style={{ color: "var(--color-text-muted)" }}
              >
                {branding.supportEmail}
              </a>
            )}
          </div>

          {activeSocials.length > 0 && (
            <nav aria-label="Social media links">
              <ul className="flex items-center gap-4" role="list">
                {activeSocials.map(({ platform, url, label, path }) => (
                  <li key={platform}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors hover:opacity-80"
                      style={{ color: "var(--color-text-muted)" }}
                      aria-label={`Follow us on ${label}`}
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path d={path} />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row"
          style={{ borderColor: "var(--color-border)" }}
        >
          <nav aria-label="Legal links">
            <ul className="flex items-center gap-6" role="list">
              <li>
                <a
                  href="/legal#privacy"
                  className="text-sm transition-colors hover:opacity-80"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {t("footer.privacy")}
                </a>
              </li>
              <li>
                <a
                  href="/legal#tos"
                  className="text-sm transition-colors hover:opacity-80"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {t("footer.terms")}
                </a>
              </li>
              <li>
                <a
                  href="/legal"
                  className="text-sm transition-colors hover:opacity-80"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {t("nav.legal")}
                </a>
              </li>
            </ul>
          </nav>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("footer.powered")}{" "}
            <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>
              OmniMedia OS Engine
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}