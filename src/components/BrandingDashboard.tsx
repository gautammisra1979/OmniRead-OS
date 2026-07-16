import { useState, useRef, type ChangeEvent, type DragEvent } from "react";
import { useBranding } from "~/components/BrandingProvider";
import { useLanguage } from "~/components/LanguageProvider";

export function BrandingDashboard() {
  const { branding, updateBranding, updateSocialLink, updateLogo } = useBranding();
  const { t } = useLanguage();

  const [storeName, setStoreName] = useState(branding.storeName);
  const [supportEmail, setSupportEmail] = useState(branding.supportEmail);
  const [socialTwitter, setSocialTwitter] = useState(branding.socialLinks.twitter);
  const [socialInstagram, setSocialInstagram] = useState(branding.socialLinks.instagram);
  const [socialTiktok, setSocialTiktok] = useState(branding.socialLinks.tiktok);
  const [logoPreview, setLogoPreview] = useState<string | null>(branding.logoDataUrl);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoFile = (file: File) => {
    if (!file.type.match(/\.(png|svg)$/i) && !file.type.match(/^image\/(png|svg\+xml)$/)) {
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setLogoPreview(dataUrl);
      updateLogo(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleLogoFile(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleLogoFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const removeLogo = () => {
    setLogoPreview(null);
    updateLogo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleStoreNameBlur = () => {
    if (storeName !== branding.storeName) updateBranding("storeName", storeName);
  };
  const handleEmailBlur = () => {
    if (supportEmail !== branding.supportEmail) updateBranding("supportEmail", supportEmail);
  };
  const handleTwitterBlur = () => {
    if (socialTwitter !== branding.socialLinks.twitter) updateSocialLink("twitter", socialTwitter);
  };
  const handleInstagramBlur = () => {
    if (socialInstagram !== branding.socialLinks.instagram) updateSocialLink("instagram", socialInstagram);
  };
  const handleTiktokBlur = () => {
    if (socialTiktok !== branding.socialLinks.tiktok) updateSocialLink("tiktok", socialTiktok);
  };

  return (
    <div className="mt-12 border-t border-[var(--color-border,#334155)] pt-10">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-[var(--color-text,#f8fafc)]">
          {t("admin.branding.title")}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted,#94a3b8)]">
          {t("admin.branding.desc")}
        </p>
      </div>

      {/* Section 1: Store Identity */}
      <div className="mb-8">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted,#94a3b8)]">
          Store Identity
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="brand-store-name"
              className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted,#94a3b8)]"
            >
              {t("admin.branding.storeName")}
            </label>
            <input
              id="brand-store-name"
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              onBlur={handleStoreNameBlur}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)] px-4 py-2.5 text-sm text-[var(--color-text,#f8fafc)] transition-colors focus:border-[var(--color-primary,#6366f1)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#6366f1)]"
              placeholder="OmniMedia OS"
              maxLength={60}
            />
          </div>
          <div>
            <label
              htmlFor="brand-email"
              className="block text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted,#94a3b8)]"
            >
              {t("admin.branding.supportEmail")}
            </label>
            <input
              id="brand-email"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              onBlur={handleEmailBlur}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)] px-4 py-2.5 text-sm text-[var(--color-text,#f8fafc)] transition-colors focus:border-[var(--color-primary,#6366f1)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#6366f1)]"
              placeholder="support@omnimedios.com"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Social Media Links */}
      <div className="mb-8">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted,#94a3b8)]">
          {t("admin.branding.socialLinks")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* X/Twitter */}
          <div>
            <label
              htmlFor="brand-twitter"
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted,#94a3b8)]"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              {t("admin.branding.x")}
            </label>
            <input
              id="brand-twitter"
              type="url"
              value={socialTwitter}
              onChange={(e) => setSocialTwitter(e.target.value)}
              onBlur={handleTwitterBlur}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)] px-4 py-2.5 text-sm text-[var(--color-text,#f8fafc)] transition-colors focus:border-[var(--color-primary,#6366f1)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#6366f1)]"
              placeholder="https://twitter.com/yourhandle"
            />
          </div>
          {/* Instagram */}
          <div>
            <label
              htmlFor="brand-instagram"
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted,#94a3b8)]"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 016.11 2.525c.636-.247 1.363-.416 2.427-.465C8.83 2.013 9.185 2 11.615 2h.7zm-.08 1.802h-.46c-2.397 0-2.684.01-3.634.052-.847.038-1.307.18-1.613.299a2.9 2.9 0 00-1.074.7 2.9 2.9 0 00-.7 1.074c-.118.306-.26.766-.298 1.613-.043.95-.052 1.237-.052 3.634v.46c0 2.397.01 2.684.052 3.634.037.847.18 1.307.299 1.613.156.405.387.77.699 1.074.305.312.67.543 1.074.7.306.118.766.26 1.613.298.95.043 1.237.052 3.634.052h.46c2.397 0 2.684-.01 3.634-.052.847-.038 1.307-.18 1.613-.298.404-.157.77-.388 1.074-.7.312-.304.543-.67.7-1.074.118-.306.26-.766.298-1.613.043-.95.052-1.237.052-3.634v-.46c0-2.397-.01-2.684-.052-3.634-.038-.847-.18-1.307-.299-1.613a2.9 2.9 0 00-.7-1.074 2.9 2.9 0 00-1.074-.7c-.306-.118-.766-.26-1.613-.298-.95-.043-1.237-.052-3.634-.052zm0 4.73a4.545 4.545 0 110 9.09 4.545 4.545 0 010-9.09zm0 1.802a2.743 2.743 0 100 5.486 2.743 2.743 0 000-5.486zm5.396-3.423a1.067 1.067 0 110 2.134 1.067 1.067 0 010-2.134z" />
              </svg>
              {t("admin.branding.instagram")}
            </label>
            <input
              id="brand-instagram"
              type="url"
              value={socialInstagram}
              onChange={(e) => setSocialInstagram(e.target.value)}
              onBlur={handleInstagramBlur}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)] px-4 py-2.5 text-sm text-[var(--color-text,#f8fafc)] transition-colors focus:border-[var(--color-primary,#6366f1)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#6366f1)]"
              placeholder="https://instagram.com/yourhandle"
            />
          </div>
          {/* TikTok */}
          <div>
            <label
              htmlFor="brand-tiktok"
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted,#94a3b8)]"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
              {t("admin.branding.tiktok")}
            </label>
            <input
              id="brand-tiktok"
              type="url"
              value={socialTiktok}
              onChange={(e) => setSocialTiktok(e.target.value)}
              onBlur={handleTiktokBlur}
              className="mt-1.5 w-full rounded-lg border border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)] px-4 py-2.5 text-sm text-[var(--color-text,#f8fafc)] transition-colors focus:border-[var(--color-primary,#6366f1)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary,#6366f1)]"
              placeholder="https://tiktok.com/@yourhandle"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Store Logo Upload */}
      <div className="mb-8">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted,#94a3b8)]">
          {t("admin.branding.logoUpload")}
        </h3>
        <div
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
            dragOver
              ? "border-[var(--color-primary,#6366f1)] bg-[var(--color-primary,#6366f1)]/10"
              : "border-[var(--color-border,#334155)] bg-[var(--color-surface,#1e293b)]/30"
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          role="button"
          tabIndex={0}
          aria-label="Logo upload area"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.svg"
            onChange={handleFileSelect}
            className="hidden"
            aria-hidden="true"
          />

          {logoPreview ? (
            <div className="flex flex-col items-center gap-3">
              <img
                src={logoPreview}
                alt="Store logo preview"
                className="max-h-24 max-w-48 rounded-lg object-contain"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeLogo();
                }}
                className="rounded-lg border border-[var(--color-border,#334155)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted,#94a3b8)] transition-colors hover:bg-[var(--color-surface,#1e293b)] hover:text-[var(--color-text,#f8fafc)]"
              >
                {t("admin.branding.removeLogo")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg
                className="h-10 w-10 text-[var(--color-text-muted,#94a3b8)]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <p className="text-sm text-[var(--color-text-muted,#94a3b8)]">
                {t("admin.branding.dropHint")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}