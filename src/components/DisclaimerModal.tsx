import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { getDisclaimerConfig, saveDisclaimerConfig, type DisclaimerConfig } from "~/data/membership";

export function DisclaimerModal() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<DisclaimerConfig>(getDisclaimerConfig());
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const val = localStorage.getItem("omnimedos_disclaimer_accepted");
      if (val === "true") setAccepted(true);
    }
  }, []);

  const handleAccept = useCallback(() => {
    setAccepted(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("omnimedos_disclaimer_accepted", "true");
    }
  }, []);

  const handleDecline = useCallback(() => {
    if (config.requireAcceptance) return;
    setAccepted(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("omnimedos_disclaimer_declined", "true");
    }
  }, [config.requireAcceptance]);

  if (!config.enabled || accepted) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={config.title}
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{
          backgroundColor: "var(--color-bg,#0f172a)",
          borderColor: "var(--color-border,#334155)",
        }}
      >
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 20%, transparent)" }}>
            <svg className="h-6 w-6" style={{ color: "var(--color-primary,#6366f1)" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>
            {config.title}
          </h2>
        </div>

        <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
          {config.content}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleAccept}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
            style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
          >
            {config.acceptLabel}
          </button>
          {!config.requireAcceptance && (
            <button
              type="button"
              onClick={handleDecline}
              className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
              style={{ borderColor: "var(--color-border,#334155)", color: "var(--color-text-muted,#94a3b8)" }}
            >
              {config.declineLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Disclaimer Config Admin ─── */

export function DisclaimerConfigSection() {
  const { t } = useLanguage();
  const [config, setConfig] = useState<DisclaimerConfig>(getDisclaimerConfig());
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    saveDisclaimerConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [config]);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("disclaimer.title") ?? "Exclusion Disclaimer Modal"}
      </h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        {t("disclaimer.desc") ?? "Configure the disclaimer modal shown to visitors."}
      </p>

      {saved && (
        <div className="mb-4 rounded-lg border border-emerald-800/50 bg-emerald-900/20 px-4 py-2 text-sm text-emerald-400" role="status" aria-live="polite">
          {t("common.save") ?? "Saved!"}
        </div>
      )}

      <div className="rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)" }}>
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={config.enabled}
            onClick={() => setConfig((p) => ({ ...p, enabled: !p.enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.enabled ? "bg-emerald-500" : "bg-gray-600"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.enabled ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <span className="text-sm" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("disclaimer.enable") ?? "Enable Disclaimer Modal"}
          </span>
        </div>

        <div>
          <label htmlFor="disc-title" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("disclaimer.title") ?? "Title"}
          </label>
          <input id="disc-title" type="text" value={config.title}
            onChange={(e) => setConfig((p) => ({ ...p, title: e.target.value }))}
            className="w-full max-w-md rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }} />
        </div>

        <div>
          <label htmlFor="disc-content" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("disclaimer.content") ?? "Content"}
          </label>
          <textarea id="disc-content" rows={4} value={config.content}
            onChange={(e) => setConfig((p) => ({ ...p, content: e.target.value }))}
            className="w-full max-w-lg rounded-lg border px-3 py-2 text-sm"
            style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }} />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={config.requireAcceptance}
            onClick={() => setConfig((p) => ({ ...p, requireAcceptance: !p.requireAcceptance }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.requireAcceptance ? "bg-emerald-500" : "bg-gray-600"}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.requireAcceptance ? "translate-x-6" : "translate-x-1"}`} />
          </button>
          <span className="text-sm" style={{ color: "var(--color-text,#f8fafc)" }}>
            {t("disclaimer.requireAccept") ?? "Require acceptance to continue"}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="disc-accept" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("disclaimer.acceptLabel") ?? "Accept Button Label"}
            </label>
            <input id="disc-accept" type="text" value={config.acceptLabel}
              onChange={(e) => setConfig((p) => ({ ...p, acceptLabel: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }} />
          </div>
          <div>
            <label htmlFor="disc-decline" className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
              {t("disclaimer.declineLabel") ?? "Decline Button Label"}
            </label>
            <input id="disc-decline" type="text" value={config.declineLabel}
              onChange={(e) => setConfig((p) => ({ ...p, declineLabel: e.target.value }))}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }} />
          </div>
        </div>

        <button type="button" onClick={handleSave}
          className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
          style={{ backgroundColor: "var(--color-primary,#6366f1)" }}>
          {t("common.save") ?? "Save Settings"}
        </button>
      </div>
    </div>
  );
}

/* ─── Info Modal ─── */

export function InfoModal({ id, title, content, icon, onClose }: {
  id: string;
  title: string;
  content: string;
  icon: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="mx-4 w-full max-w-lg rounded-2xl border p-6 shadow-2xl"
        style={{
          backgroundColor: "var(--color-bg,#0f172a)",
          borderColor: "var(--color-border,#334155)",
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">{icon}</span>
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text,#f8fafc)" }}>
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:opacity-80"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
          {content}
        </div>
      </div>
    </div>
  );
}

/* ─── Info Modal Admin Config ─── */

export function InfoModalConfigSection() {
  const { t } = useLanguage();
  const [modals, setModals] = useState<ReturnType<typeof import("~/data/membership")["getInfoModals"]>>([]);
  const [saved, setSaved] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newIcon, setNewIcon] = useState("ℹ️");
  const [newLinkLabel, setNewLinkLabel] = useState("");

  useEffect(() => {
    const { getInfoModals } = require("~/data/membership") as typeof import("~/data/membership");
    setModals(getInfoModals());
  }, []);

  const handleAdd = useCallback(() => {
    if (!newTitle.trim() || !newContent.trim()) return;
    const { addInfoModal } = require("~/data/membership") as typeof import("~/data/membership");
    const id = `info-${Date.now()}`;
    addInfoModal({ id, title: newTitle.trim(), content: newContent.trim(), icon: newIcon, linkLabel: newLinkLabel.trim() || "Learn More" });
    const { getInfoModals } = require("~/data/membership") as typeof import("~/data/membership");
    setModals(getInfoModals());
    setShowForm(false);
    setNewTitle("");
    setNewContent("");
    setNewIcon("ℹ️");
    setNewLinkLabel("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [newTitle, newContent, newIcon, newLinkLabel]);

  const handleRemove = useCallback((id: string) => {
    const { removeInfoModal } = require("~/data/membership") as typeof import("~/data/membership");
    removeInfoModal(id);
    const { getInfoModals } = require("~/data/membership") as typeof import("~/data/membership");
    setModals(getInfoModals());
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <h2 className="mb-1 text-lg font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
        {t("infoModal.title") ?? "Info Modals for Header Navigation"}
      </h2>
      <p className="mb-6 text-sm" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
        {t("infoModal.desc") ?? "Create info modals that appear as links in the header navigation."}
      </p>

      {saved && (
        <div className="mb-4 rounded-lg border border-emerald-800/50 bg-emerald-900/20 px-4 py-2 text-sm text-emerald-400" role="status" aria-live="polite">
          Saved!
        </div>
      )}

      <div className="space-y-3">
        {modals.map((modal) => (
          <div key={modal.id} className="flex items-center justify-between rounded-lg border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)" }}>
            <div className="flex items-center gap-3">
              <span className="text-xl" aria-hidden="true">{modal.icon}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>{modal.title}</p>
                <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{modal.linkLabel}</p>
              </div>
            </div>
            <button type="button" onClick={() => handleRemove(modal.id)}
              className="rounded border border-red-800/50 px-2 py-1 text-[10px] text-red-400 transition-colors hover:bg-red-900/20">
              {t("common.cancel") ?? "Remove"}
            </button>
          </div>
        ))}
        {modals.length === 0 && !showForm && (
          <p className="text-sm text-center py-4" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
            {t("infoModal.empty") ?? "No info modals created yet."}
          </p>
        )}
      </div>

      {showForm && (
        <div className="mt-4 rounded-xl border p-5 space-y-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 30%, transparent)" }}>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("infoModal.title") ?? "Title"}</label>
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              className="w-full max-w-md rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }} />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("infoModal.content") ?? "Content"}</label>
            <textarea rows={4} value={newContent} onChange={(e) => setNewContent(e.target.value)}
              className="w-full max-w-lg rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("infoModal.icon") ?? "Icon (emoji)"}</label>
              <input type="text" value={newIcon} onChange={(e) => setNewIcon(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }} />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("infoModal.linkLabel") ?? "Nav Link Label"}</label>
              <input type="text" value={newLinkLabel} onChange={(e) => setNewLinkLabel(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm" style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={handleAdd}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110"
              style={{ backgroundColor: "var(--color-primary,#6366f1)" }}>
              {t("infoModal.add") ?? "Add Info Modal"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-lg border px-4 py-2 text-xs font-medium transition-colors"
              style={{ borderColor: "var(--color-border,#334155)", color: "var(--color-text-muted,#94a3b8)" }}>
              {t("common.cancel") ?? "Cancel"}
            </button>
          </div>
        </div>
      )}

      {!showForm && (
        <button type="button" onClick={() => setShowForm(true)}
          className="mt-4 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110"
          style={{ backgroundColor: "var(--color-primary,#6366f1)" }}>
          {t("infoModal.create") ?? "Create Info Modal"}
        </button>
      )}
    </div>
  );
}