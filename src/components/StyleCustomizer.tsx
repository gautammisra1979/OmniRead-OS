import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import {
  getStylePresets,
  saveStylePresets,
  applyStylePresets,
  BORDER_PRESETS,
  TYPOGRAPHY_PRESETS,
  type BorderPreset,
  type TypographyPreset,
  type AnnouncementConfig,
  getAnnouncementConfig,
  saveAnnouncementConfig,
} from "~/data/stylePresets";

export function StyleCustomizer() {
  const { t } = useLanguage();
  const [presets, setPresets] = useState(getStylePresets());
  const [saved, setSaved] = useState(false);

  const handleBorderChange = useCallback((border: BorderPreset) => {
    const next = { ...presets, border };
    setPresets(next);
    saveStylePresets(next);
    applyStylePresets(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [presets]);

  const handleTypoChange = useCallback((typography: TypographyPreset) => {
    const next = { ...presets, typography };
    setPresets(next);
    saveStylePresets(next);
    applyStylePresets(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [presets]);

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("style.title") ?? "Storefront Style Customizer"}
      </h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        {t("style.desc") ?? "Customize border styles, shadows, and typography for your storefront."}
      </p>

      {saved && (
        <div className="mb-4 rounded-lg border border-emerald-800/50 bg-emerald-900/20 px-4 py-2 text-sm text-emerald-400" role="status" aria-live="polite">
          {t("style.saved") ?? "Style updated!"}
        </div>
      )}

      {/* Border/Shadow Presets */}
      <div className="mb-6 rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)" }}>
        <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
          {t("style.border") ?? "Border & Shadow Presets"}
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.entries(BORDER_PRESETS) as [BorderPreset, typeof BORDER_PRESETS[BorderPreset]][]).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleBorderChange(key)}
              className={`rounded-xl border p-5 text-left transition-all hover:opacity-80 ${presets.border === key ? "ring-2" : ""}`}
              style={{
                borderColor: presets.border === key ? "var(--color-primary,#6366f1)" : "var(--color-border,#334155)",
                backgroundColor: presets.border === key ? "color-mix(in srgb, var(--color-primary,#6366f1) 15%, transparent)" : "var(--color-surface,#1e293b)/30",
                borderRadius: key === "sharp" ? "0px" : key === "rounded" ? "12px" : "20px",
                boxShadow: key === "sharp" ? "none" : key === "rounded" ? "0 4px 6px -1px rgba(0,0,0,0.1)" : "0 20px 25px -5px rgba(0,0,0,0.2)",
              }}
              aria-label={cfg.name}
              aria-pressed={presets.border === key}
            >
              <div className="mb-2 text-2xl" aria-hidden="true">
                {key === "sharp" ? "🔲" : key === "rounded" ? "🔘" : "💠"}
              </div>
              <h4 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
                {cfg.name}
              </h4>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {key === "sharp" ? t("style.sharpDesc") ?? "No rounded corners, flat shadows" : key === "rounded" ? t("style.roundedDesc") ?? "Subtle rounded corners, light shadows" : t("style.elevatedDesc") ?? "Large rounded corners, elevated shadows"}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Typography Presets */}
      <div className="mb-6 rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)" }}>
        <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
          {t("style.typography") ?? "Typography Presets"}
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.entries(TYPOGRAPHY_PRESETS) as [TypographyPreset, typeof TYPOGRAPHY_PRESETS[TypographyPreset]][]).map(([key, cfg]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleTypoChange(key)}
              className={`rounded-xl border p-5 text-left transition-all hover:opacity-80 ${presets.typography === key ? "ring-2" : ""}`}
              style={{
                borderColor: presets.typography === key ? "var(--color-primary,#6366f1)" : "var(--color-border,#334155)",
                backgroundColor: presets.typography === key ? "color-mix(in srgb, var(--color-primary,#6366f1) 15%, transparent)" : "var(--color-surface,#1e293b)/30",
              }}
              aria-label={cfg.name}
              aria-pressed={presets.typography === key}
            >
              <div className="mb-2 text-2xl" aria-hidden="true">
                {key === "modern" ? "✍️" : key === "classic" ? "🖋️" : "📝"}
              </div>
              <h4 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)", fontFamily: cfg.fontFamily, fontWeight: cfg.headingWeight }}>
                {cfg.name}
              </h4>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)", fontFamily: cfg.fontFamily, letterSpacing: cfg.letterSpacing }}>
                {key === "modern" ? t("style.modernDesc") ?? "Clean sans-serif, bold headings" : key === "classic" ? t("style.classicDesc") ?? "Elegant serif, rich typography" : t("style.minimalDesc") ?? "Lightweight, airy, spacious"}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Announcement Bar Config Section ─── */

export function AnnouncementConfigSection() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<AnnouncementConfig>(getAnnouncementConfig());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setConfig(getAnnouncementConfig());
  }, []);

  const handleSave = useCallback(() => {
    saveAnnouncementConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Trigger re-render of announcement bar
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("announcement-changed", { detail: config }));
    }
  }, [config]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("announce.title") ?? "Header Announcements & Shipping"}
      </h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        {t("announce.desc") ?? "Configure the announcement bar, shipping messages, and promotions header."}
      </p>

      {saved && (
        <div className="mb-4 rounded-lg border border-emerald-800/50 bg-emerald-900/20 px-4 py-2 text-sm text-emerald-400" role="status" aria-live="polite">
          {t("announce.saved") ?? "Announcement settings saved!"}
        </div>
      )}

      <div className="rounded-xl border p-5" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)" }}>
        <div className="space-y-4">
          {/* Enable toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={config.enabled}
              aria-label={t("announce.enable") ?? "Enable Announcement Bar"}
              onClick={() => setConfig((p) => ({ ...p, enabled: !p.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.enabled ? "bg-emerald-500" : "bg-gray-600"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.enabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className="text-sm" style={{ color: "var(--color-text,#f8fafc)" }}>
              {t("announce.enable") ?? "Enable Announcement Bar"}
            </span>
          </div>

          {/* Announcement Text */}
          <div>
            <label htmlFor="announce-text" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("announce.text") ?? "Announcement Text"}
            </label>
            <input
              id="announce-text"
              type="text"
              value={config.text}
              onChange={(e) => setConfig((p) => ({ ...p, text: e.target.value }))}
              className="w-full max-w-md rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              placeholder="Free shipping on orders over $50!"
            />
          </div>

          {/* Announcement Type */}
          <div>
            <label htmlFor="announce-type" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("announce.type") ?? "Announcement Type"}
            </label>
            <select
              id="announce-type"
              value={config.type}
              onChange={(e) => setConfig((p) => ({ ...p, type: e.target.value as AnnouncementConfig["type"] }))}
              className="w-full max-w-xs rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
            >
              <option value="info">{t("announce.typeInfo") ?? "Info"}</option>
              <option value="sale">{t("announce.typeSale") ?? "Sale"}</option>
              <option value="shipping">{t("announce.typeShipping") ?? "Shipping"}</option>
              <option value="warning">{t("announce.typeWarning") ?? "Warning"}</option>
            </select>
          </div>

          {/* Dismissible */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={config.dismissible}
              aria-label={t("announce.dismissible") ?? "Dismissible"}
              onClick={() => setConfig((p) => ({ ...p, dismissible: !p.dismissible }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.dismissible ? "bg-emerald-500" : "bg-gray-600"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.dismissible ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className="text-sm" style={{ color: "var(--color-text,#f8fafc)" }}>
              {t("announce.dismissible") ?? "Dismissible by visitors"}
            </span>
          </div>

          {/* Link URL */}
          <div>
            <label htmlFor="announce-link" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("announce.linkUrl") ?? "Link URL (optional)"}
            </label>
            <input
              id="announce-link"
              type="text"
              value={config.linkUrl}
              onChange={(e) => setConfig((p) => ({ ...p, linkUrl: e.target.value }))}
              className="w-full max-w-md rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              placeholder="/products"
            />
          </div>

          {/* Link Text */}
          <div>
            <label htmlFor="announce-link-text" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("announce.linkText") ?? "Link Text"}
            </label>
            <input
              id="announce-link-text"
              type="text"
              value={config.linkText}
              onChange={(e) => setConfig((p) => ({ ...p, linkText: e.target.value }))}
              className="w-full max-w-xs rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              placeholder="Learn More"
            />
          </div>

          {/* Shipping Threshold */}
          <div>
            <label htmlFor="announce-ship" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("announce.shippingThreshold") ?? "Free Shipping Threshold ($)"}
            </label>
            <input
              id="announce-ship"
              type="number"
              min={0}
              value={config.shippingThreshold}
              onChange={(e) => setConfig((p) => ({ ...p, shippingThreshold: parseFloat(e.target.value) || 0 }))}
              className="w-32 rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
            />
          </div>

          {/* Shipping Message */}
          <div>
            <label htmlFor="announce-ship-msg" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("announce.shippingMessage") ?? "Shipping Message (use {threshold} for amount)"}
            </label>
            <input
              id="announce-ship-msg"
              type="text"
              value={config.shippingMessage}
              onChange={(e) => setConfig((p) => ({ ...p, shippingMessage: e.target.value }))}
              className="w-full max-w-md rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
              placeholder="Free shipping on orders over ${threshold}!"
            />
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
          >
            {t("common.save") ?? "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}