import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useLanguage } from "~/components/LanguageProvider";
import { useBranding } from "~/components/BrandingProvider";

type LegalTab = "tos" | "privacy" | "storage";

export const Route = createFileRoute("/legal")({
  component: LegalPage,
});

function LegalPage() {
  const { t } = useLanguage();
  const { branding } = useBranding();
  const [activeTab, setActiveTab] = useState<LegalTab>("tos");

  const storeName = branding.storeName || "OmniMedia OS";
  const supportEmail = branding.supportEmail || "support@omnimedios.com";

  const tabs: { id: LegalTab; label: string; key: string }[] = [
    { id: "tos", label: t("legal.tos"), key: "legal.tos" },
    { id: "privacy", label: t("legal.privacy"), key: "legal.privacy" },
    { id: "storage", label: t("legal.storage"), key: "legal.storage" },
  ];

  const injectBranding = (content: string): string => {
    return content
      .replace(/\{storeName\}/g, storeName)
      .replace(/\{supportEmail\}/g, supportEmail);
  };

  const getContent = (): string => {
    switch (activeTab) {
      case "tos":
        return injectBranding(t("legal.tosContent"));
      case "privacy":
        return injectBranding(t("legal.privacyContent"));
      case "storage":
        return injectBranding(t("legal.storageContent"));
    }
  };

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: "var(--color-bg, #0f172a)" }}>
      {/* Header */}
      <div
        className="border-b"
        style={{
          borderColor: "var(--color-border, #334155)",
          backgroundColor: "color-mix(in srgb, var(--color-surface, #1e293b) 50%, transparent)",
        }}
      >
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg shadow-sm"
              style={{ backgroundColor: "var(--color-primary, #6366f1)" }}
              aria-hidden="true"
            >
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-3.75h.008v.008H12V6zm0 12h.008v.008H12V18z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: "var(--color-text, #f8fafc)" }}>
                {t("legal.title")}
              </h1>
              <p className="text-sm" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
                {t("legal.subtitle")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <nav className="mb-8 flex gap-2" role="tablist" aria-label={t("legal.nav")}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "text-white shadow-sm"
                  : "hover:opacity-80"
              }`}
              style={{
                backgroundColor: activeTab === tab.id
                  ? "var(--color-primary, #6366f1)"
                  : "color-mix(in srgb, var(--color-surface, #1e293b) 50%, transparent)",
                color: activeTab === tab.id ? "#fff" : "var(--color-text-muted, #94a3b8)",
                borderColor: "var(--color-border, #334155)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content Panel */}
        <div
          id={`panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={activeTab}
          className="animate-fade-in rounded-xl border p-6 sm:p-8"
          style={{
            borderColor: "var(--color-border, #334155)",
            backgroundColor: "color-mix(in srgb, var(--color-surface, #1e293b) 50%, transparent)",
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-text, #f8fafc)" }}>
              {tabs.find((t) => t.id === activeTab)?.label}
            </h2>
            <span className="text-xs" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
              {t("legal.lastUpdated").replace("{date}", new Date().toLocaleDateString())}
            </span>
          </div>

          <div
            className="prose prose-sm max-w-none leading-relaxed"
            style={{ color: "var(--color-text-muted, #94a3b8)" }}
          >
            <p>{getContent()}</p>
          </div>

          {/* Contact info */}
          <div
            className="mt-8 rounded-lg border p-4"
            style={{
              borderColor: "var(--color-border, #334155)",
              backgroundColor: "var(--color-bg, #0f172a)",
            }}
          >
            <p className="text-xs" style={{ color: "var(--color-text-muted, #94a3b8)" }}>
              {storeName} &mdash;{" "}
              <a
                href={`mailto:${supportEmail}`}
                className="underline underline-offset-2 transition-colors hover:opacity-80"
                style={{ color: "var(--color-primary, #6366f1)" }}
              >
                {supportEmail}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}