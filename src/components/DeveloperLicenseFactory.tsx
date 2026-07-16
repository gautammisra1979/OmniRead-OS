/**
 * DeveloperLicenseFactory — Admin tool for generating, signing, and managing
 * cryptographic license keys. Embedded in the /admin switchboard.
 *
 * Full RSA-PSS 2048-bit key pair management, license issuance, token export,
 * activation simulation, and revocation. All state in localStorage.
 * Zero-server architecture.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import {
  hasKeyPair,
  getKeyPair,
  generateKeyPair,
  issueLicense,
  getLicenses,
  exportLicenseToken,
  revokeLicense,
  deleteLicense,
  seedDemoLicense,
  resetFeatureCache,
  type License,
} from "~/data/licensing";
import { dispatchLicenseChange } from "~/components/LicenseGate";

export function DeveloperLicenseFactory() {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [kpExists, setKpExists] = useState(hasKeyPair());
  const [kpData, setKpData] = useState(getKeyPair());
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // License issue form
  const [licType, setLicType] = useState<"developer" | "trial" | "full">("developer");
  const [licHolder, setLicHolder] = useState("OmniMedia Developer");
  const [licExpiry, setLicExpiry] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });
  const [licMaxActivations, setLicMaxActivations] = useState(10);
  const [licAllFeatures, setLicAllFeatures] = useState(true);
  const [issuing, setIssuing] = useState(false);

  // License list
  const [licenses, setLicenses] = useState<License[]>([]);
  const [licRefresh, setLicRefresh] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tokenMap, setTokenMap] = useState<Record<string, string>>({});

  const refreshLicenses = useCallback(() => {
    setLicenses(getLicenses());
    setLicRefresh((r) => r + 1);
  }, []);

  useEffect(() => { refreshLicenses(); }, [refreshLicenses]);

  const handleGenerateKeys = useCallback(async () => {
    setGenerating(true);
    setStatus(null);
    try {
      const kp = await generateKeyPair();
      setKpExists(true);
      setKpData(kp);
      setStatus({ type: "success", message: "Cryptographic key pair generated successfully!" });
      resetFeatureCache();
    } catch {
      setStatus({ type: "error", message: "Failed to generate key pair." });
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleIssueLicense = useCallback(async () => {
    if (!kpExists) {
      setStatus({ type: "error", message: "Generate a key pair first." });
      return;
    }
    setIssuing(true);
    setStatus(null);
    try {
      const features = licAllFeatures ? ["all"] : ["quiz", "challenge", "progress", "affiliate", "product-media"];
      await issueLicense({
        type: licType,
        features,
        holder: licHolder.trim(),
        expiresAt: new Date(licExpiry + "T23:59:59Z").toISOString(),
        maxActivations: licMaxActivations,
      });
      setStatus({ type: "success", message: `License issued to "${licHolder}"!` });
      refreshLicenses();
      resetFeatureCache();
      dispatchLicenseChange();
    } catch {
      setStatus({ type: "error", message: "Failed to issue license." });
    } finally {
      setIssuing(false);
    }
  }, [kpExists, licType, licHolder, licExpiry, licMaxActivations, licAllFeatures, refreshLicenses]);

  const handleExport = useCallback(async (id: string) => {
    try {
      const token = await exportLicenseToken(id);
      if (token) {
        await navigator.clipboard.writeText(token);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
        setTokenMap((prev) => ({ ...prev, [id]: token }));
      } else {
        setStatus({ type: "error", message: "License not found or revoked." });
      }
    } catch {
      setStatus({ type: "error", message: "Failed to export license token." });
    }
  }, []);

  const handleRevoke = useCallback((id: string) => {
    revokeLicense(id);
    resetFeatureCache();
    dispatchLicenseChange();
    refreshLicenses();
    setStatus({ type: "info", message: t("license.factoryRevoked") });
  }, [refreshLicenses, t]);

  const handleDelete = useCallback((id: string) => {
    deleteLicense(id);
    resetFeatureCache();
    dispatchLicenseChange();
    refreshLicenses();
    setStatus({ type: "info", message: t("license.factoryDeleted") });
  }, [refreshLicenses, t]);

  const handleSeedDemo = useCallback(async () => {
    if (!kpExists) {
      setStatus({ type: "error", message: "Generate a key pair first." });
      return;
    }
    setStatus(null);
    try {
      await seedDemoLicense();
      setStatus({ type: "success", message: t("license.demoSeeded") });
      refreshLicenses();
      resetFeatureCache();
      dispatchLicenseChange();
    } catch {
      setStatus({ type: "error", message: "Failed to seed demo license." });
    }
  }, [kpExists, refreshLicenses, t]);

  const handleCopyPublicKey = useCallback(async () => {
    if (kpData?.publicKey) {
      try {
        await navigator.clipboard.writeText(kpData.publicKey);
        setStatus({ type: "success", message: t("license.factoryKeyCopied") });
      } catch {
        setStatus({ type: "error", message: "Failed to copy to clipboard." });
      }
    }
  }, [kpData, t]);

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
  };

  const isExpired = (iso: string) => new Date(iso) < new Date();

  return (
    <div className="mx-auto mt-10 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="rounded-xl border" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "color-mix(in srgb, var(--color-surface,#1e293b) 50%, transparent)" }}>
        {/* Section Header */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:opacity-80"
          aria-expanded={expanded}
          aria-label={t("license.factoryTitle")}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: "color-mix(in srgb, var(--color-primary,#6366f1) 20%, transparent)" }} aria-hidden="true">
              <svg className="h-5 w-5" style={{ color: "var(--color-primary,#6366f1)" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--color-text,#f8fafc)" }}>
                🔑 {t("license.factoryTitle")}
              </h3>
              <p className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("license.factoryDesc")}
              </p>
            </div>
          </div>
          <svg className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            style={{ color: "var(--color-text-muted,#94a3b8)" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {expanded && (
          <div className="border-t px-5 py-5 space-y-6" style={{ borderColor: "var(--color-border,#334155)" }}>
            {/* Status message */}
            {status && (
              <div className={`rounded-lg px-4 py-3 text-sm ${
                status.type === "success" ? "bg-emerald-900/30 text-emerald-400" :
                status.type === "error" ? "bg-red-900/30 text-red-400" :
                "bg-blue-900/30 text-blue-400"
              }`} role="status" aria-live="polite">
                {status.message}
              </div>
            )}

            {/* Section 1: Key Pair Management */}
            <div className="rounded-lg border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg,#0f172a)" }}>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("license.factoryKeyPair")}
              </h4>
              {kpExists ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      ✓ {t("status.active")}
                    </span>
                    <span className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                      {t("license.factoryKeysExist").replace("{date}", kpData ? formatDate(kpData.generatedAt) : "")}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateKeys}
                      disabled={generating}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-40"
                      style={{ borderColor: "var(--color-border,#334155)", color: "var(--color-text,#f8fafc)" }}
                    >
                      {generating ? "Generating..." : t("license.factoryRegenerate")}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPublicKey}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                      style={{ borderColor: "var(--color-border,#334155)", color: "var(--color-text-muted,#94a3b8)" }}
                    >
                      {t("license.factoryExportKey")}
                    </button>
                    <button
                      type="button"
                      onClick={handleSeedDemo}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110"
                      style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
                    >
                      {t("license.seedDemo")}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="mb-3 text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                    {t("license.factoryNoKeys")}
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateKeys}
                    disabled={generating}
                    className="rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-40"
                    style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
                  >
                    {generating ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                        Generating...
                      </span>
                    ) : t("license.factoryGenerateKeys")}
                  </button>
                </div>
              )}
            </div>

            {/* Section 2: Issue New License */}
            <div className="rounded-lg border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg,#0f172a)" }}>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                {t("license.factoryIssueLicense")}
              </h4>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                    {t("license.factoryLicenseType")}
                  </label>
                  <select
                    value={licType}
                    onChange={(e) => setLicType(e.target.value as "developer" | "trial" | "full")}
                    className="w-full rounded-lg border px-3 py-2 text-xs"
                    style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                  >
                    <option value="developer">{t("license.factoryTypeDeveloper")}</option>
                    <option value="trial">{t("license.factoryTypeTrial")}</option>
                    <option value="full">{t("license.factoryTypeFull")}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                    {t("license.factoryHolder")}
                  </label>
                  <input
                    type="text"
                    value={licHolder}
                    onChange={(e) => setLicHolder(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-xs"
                    style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                    placeholder="e.g. Acme Publishing"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                    {t("license.factoryExpiry")}
                  </label>
                  <input
                    type="date"
                    value={licExpiry}
                    onChange={(e) => setLicExpiry(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-xs"
                    style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                    {t("license.factoryMaxActivations")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={licMaxActivations}
                    onChange={(e) => setLicMaxActivations(parseInt(e.target.value) || 1)}
                    className="w-full rounded-lg border px-3 py-2 text-xs"
                    style={{ backgroundColor: "var(--color-bg,#0f172a)", color: "var(--color-text,#f8fafc)", borderColor: "var(--color-border,#334155)" }}
                  />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={licAllFeatures}
                    onChange={(e) => setLicAllFeatures(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                    {t("license.factoryAllFeatures")}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={handleIssueLicense}
                  disabled={issuing || !kpExists || !licHolder.trim()}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:opacity-40"
                  style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
                >
                  {issuing ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                      Issuing...
                    </span>
                  ) : t("license.factoryIssue")}
                </button>
              </div>
            </div>

            {/* Section 3: Issued Licenses */}
            <div className="rounded-lg border p-4" style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-bg,#0f172a)" }}>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  {t("license.factoryLicenses")} ({licenses.length})
                </h4>
                <button
                  type="button"
                  onClick={refreshLicenses}
                  className="rounded p-1 transition-colors hover:opacity-80"
                  style={{ color: "var(--color-text-muted,#94a3b8)" }}
                  aria-label={t("license.refresh")}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                </button>
              </div>

              {licenses.length === 0 ? (
                <p className="py-4 text-center text-xs" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                  {t("license.factoryNone")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                        <th className="px-2 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("license.type")}</th>
                        <th className="px-2 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("license.factoryHolder")}</th>
                        <th className="px-2 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("license.issued")}</th>
                        <th className="px-2 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("license.expires")}</th>
                        <th className="px-2 py-2 font-medium" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("license.status")}</th>
                        <th className="px-2 py-2 font-medium text-right" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{t("license.factoryFeatures")}</th>
                        <th className="px-2 py-2 font-medium text-right" style={{ color: "var(--color-text-muted,#94a3b8)" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {licenses.map((lic) => (
                        <tr key={lic.id} className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                          <td className="px-2 py-2">
                            <span className="rounded bg-blue-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-blue-400 uppercase">
                              {lic.type}
                            </span>
                          </td>
                          <td className="px-2 py-2 max-w-[120px] truncate" style={{ color: "var(--color-text,#f8fafc)" }}>{lic.holder}</td>
                          <td className="px-2 py-2" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{formatDate(lic.issuedAt)}</td>
                          <td className="px-2 py-2" style={{ color: "var(--color-text-muted,#94a3b8)" }}>{formatDate(lic.expiresAt)}</td>
                          <td className="px-2 py-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              lic.revoked ? "bg-red-900/30 text-red-400" :
                              isExpired(lic.expiresAt) ? "bg-amber-900/30 text-amber-400" :
                              "bg-emerald-900/30 text-emerald-400"
                            }`}>
                              {lic.revoked ? t("license.revoked") :
                               isExpired(lic.expiresAt) ? t("license.expired") :
                               t("license.active")}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className="text-[10px]" style={{ color: "var(--color-text-muted,#94a3b8)" }}>
                              {lic.features.includes("all") ? t("license.allFeatures") : lic.features.length + " features"}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <div className="flex gap-1 justify-end">
                              <button
                                type="button"
                                onClick={() => handleExport(lic.id)}
                                className="rounded px-2 py-1 text-[10px] font-medium transition-colors hover:opacity-80"
                                style={{ color: "var(--color-primary,#6366f1)" }}
                                aria-label={t("license.factoryExport")}
                              >
                                {copiedId === lic.id ? "✓ Copied!" : t("license.factoryExport")}
                              </button>
                              {!lic.revoked && (
                                <button
                                  type="button"
                                  onClick={() => handleRevoke(lic.id)}
                                  className="rounded px-2 py-1 text-[10px] font-medium transition-colors hover:opacity-80"
                                  style={{ color: "#f59e0b" }}
                                  aria-label={t("license.factoryRevoke")}
                                >
                                  {t("license.factoryRevoke")}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDelete(lic.id)}
                                className="rounded px-2 py-1 text-[10px] font-medium transition-colors hover:opacity-80"
                                style={{ color: "#ef4444" }}
                                aria-label={t("license.factoryDelete")}
                              >
                                {t("license.factoryDelete")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}