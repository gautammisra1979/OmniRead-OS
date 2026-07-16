import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "~/components/LanguageProvider";
import { useBranding } from "~/components/BrandingProvider";
import { type Locale } from "~/data/translations";
import { getWallet, addCredits } from "~/data/wallet";
import { getAffiliateProfile, getAffiliateLedger } from "~/data/affiliate";
import {
  getLocalStorageUsageBytes,
  getLocalStorageLimit,
  formatBytes,
  getUsagePercentage,
  getPersona,
  exportBackup,
  downloadBackup,
  type Persona,
} from "~/data/storageBackup";
import { getSyncStatus, disconnectCloud, uploadToCloud } from "~/data/cloudSync";

type TabId = "profile" | "billing" | "history" | "storage";

interface TabConfig {
  id: TabId;
  labelKey: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { id: "profile", labelKey: "controlCenter.profile", icon: "👤" },
  { id: "billing", labelKey: "controlCenter.billing", icon: "💳" },
  { id: "history", labelKey: "controlCenter.history", icon: "📊" },
  { id: "storage", labelKey: "controlCenter.storage", icon: "💾" },
];

export function UserControlCenter({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t, locale, setLocale } = useLanguage();
  const { branding } = useBranding();
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [persona, setPersona] = useState<Persona>("buyer");

  // Profile form state
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileDisplayTheme, setProfileDisplayTheme] = useState("dark");
  const [profileLang, setProfileLang] = useState<Locale>(locale);

  // Saved values for cancel/restore
  const savedProfile = useRef({ name: "", email: "", theme: "dark", lang: locale as Locale });

  // Billing state
  const [walletCredits, setWalletCredits] = useState(0);
  const [refillLoading, setRefillLoading] = useState(false);

  // History state
  const [affiliateProfile, setAffiliateProfile] = useState<ReturnType<typeof getAffiliateProfile>>(null);
  const [affiliateLedger, setAffiliateLedger] = useState<ReturnType<typeof getAffiliateLedger>>([]);

  // Storage state
  const [storageUsed, setStorageUsed] = useState(0);
  const [storagePercent, setStoragePercent] = useState(0);
  const [cloudStatus, setCloudStatus] = useState<ReturnType<typeof getSyncStatus>>({
    connected: false,
    provider: null,
    lastSyncAt: null,
    syncing: false,
  });

  // Load data when modal opens
  useEffect(() => {
    if (!open) return;

    const p = getPersona();
    setPersona(p);

    // Load stored profile values
    const storedName = localStorage.getItem("omnimedia_profile_name") ?? "";
    const storedEmail = localStorage.getItem("omnimedia_profile_email") ?? "";
    const storedTheme = localStorage.getItem("omnimedia_profile_theme") ?? "dark";
    setProfileName(storedName);
    setProfileEmail(storedEmail);
    setProfileDisplayTheme(storedTheme);
    setProfileLang(locale);
    savedProfile.current = { name: storedName, email: storedEmail, theme: storedTheme, lang: locale };

    // Billing
    const wallet = getWallet();
    setWalletCredits(wallet.credits);

    // History
    setAffiliateProfile(getAffiliateProfile());
    setAffiliateLedger(getAffiliateLedger());

    // Storage
    setStorageUsed(getLocalStorageUsageBytes());
    setStoragePercent(getUsagePercentage());
    setCloudStatus(getSyncStatus());

    // Reset to first tab
    setActiveTab("profile");
  }, [open, locale]);

  const handleSaveProfile = useCallback(() => {
    localStorage.setItem("omnimedia_profile_name", profileName);
    localStorage.setItem("omnimedia_profile_email", profileEmail);
    localStorage.setItem("omnimedia_profile_theme", profileDisplayTheme);
    setLocale(profileLang);
    savedProfile.current = { name: profileName, email: profileEmail, theme: profileDisplayTheme, lang: profileLang };
  }, [profileName, profileEmail, profileDisplayTheme, profileLang, setLocale]);

  const handleCancel = useCallback(() => {
    setProfileName(savedProfile.current.name);
    setProfileEmail(savedProfile.current.email);
    setProfileDisplayTheme(savedProfile.current.theme);
    setProfileLang(savedProfile.current.lang);
    onClose();
  }, [onClose]);

  const handleRefill = useCallback(() => {
    setRefillLoading(true);
    setTimeout(() => {
      addCredits(100);
      setWalletCredits(getWallet().credits);
      setRefillLoading(false);
    }, 1500);
  }, []);

  const handleExport = useCallback(async () => {
    const backup = await exportBackup();
    downloadBackup(backup);
  }, []);

  const handleCloudFlush = useCallback(async () => {
    await uploadToCloud();
    setCloudStatus(getSyncStatus());
  }, []);

  if (!open) return null;

  const isOwner = persona === "owner";
  const isAffiliate = persona === "affiliate";

  const renderTab = (tabId: TabId) => {
    switch (tabId) {
      case "profile":
        return (
          <div role="tabpanel" aria-labelledby="tab-profile" className="space-y-5">
            <h3 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
              {t("controlCenter.profile")}
            </h3>

            <div>
              <label htmlFor="ucc-name" className="block text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                {t("profile.name")}
              </label>
              <input
                id="ucc-name"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--color-bg,#0f172a)",
                  color: "var(--color-text,#f8fafc)",
                  borderColor: "var(--color-border,#334155)",
                }}
                placeholder={t("profile.name")}
              />
            </div>

            <div>
              <label htmlFor="ucc-email" className="block text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                {t("profile.email")}
              </label>
              <input
                id="ucc-email"
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--color-bg,#0f172a)",
                  color: "var(--color-text,#f8fafc)",
                  borderColor: "var(--color-border,#334155)",
                }}
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label htmlFor="ucc-theme" className="block text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                {t("profile.display")}
              </label>
              <select
                id="ucc-theme"
                value={profileDisplayTheme}
                onChange={(e) => setProfileDisplayTheme(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--color-bg,#0f172a)",
                  color: "var(--color-text,#f8fafc)",
                  borderColor: "var(--color-border,#334155)",
                }}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>

            <div>
              <label htmlFor="ucc-lang" className="block text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                {t("profile.language")}
              </label>
              <select
                id="ucc-lang"
                value={profileLang}
                onChange={(e) => setProfileLang(e.target.value as Locale)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                style={{
                  backgroundColor: "var(--color-bg,#0f172a)",
                  color: "var(--color-text,#f8fafc)",
                  borderColor: "var(--color-border,#334155)",
                }}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveProfile}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
                style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
              >
                {t("common.save")}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-lg border px-5 py-2 text-sm font-medium transition-colors"
                style={{ borderColor: "var(--color-border,#334155)", color: "var(--color-text-muted)" }}
              >
                {t("common.cancel")}
              </button>
            </div>
          </div>
        );

      case "billing":
        return (
          <div role="tabpanel" aria-labelledby="tab-billing" className="space-y-5">
            {isOwner ? (
              <>
                <h3 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
                  {t("billing.tier")}
                </h3>
                <div
                  className="rounded-xl border p-5"
                  style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
                >
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: "var(--color-text-muted)" }}>White-Label Tier</span>
                      <span className="font-semibold" style={{ color: "var(--color-text)" }}>Professional</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--color-text-muted)" }}>Monthly Rate</span>
                      <span className="font-semibold" style={{ color: "var(--color-text)" }}>$29.99/mo</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--color-text-muted)" }}>Products Allowed</span>
                      <span className="font-semibold" style={{ color: "var(--color-text)" }}>Unlimited</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: "var(--color-text-muted)" }}>Storage Used</span>
                      <span className="font-semibold" style={{ color: "var(--color-text)" }}>{formatBytes(storageUsed)}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
                  {t("billing.wallet")}
                </h3>
                <div
                  className="rounded-xl border p-5"
                  style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                        {t("chat.credits").replace("{balance}", "")}
                      </p>
                      <p className="mt-1 text-2xl font-bold" style={{ color: "var(--color-text)" }}>
                        {walletCredits}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRefill}
                      disabled={refillLoading}
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
                    >
                      {refillLoading ? (
                        <span className="flex items-center gap-2">
                          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          {t("chat.refilling")}
                        </span>
                      ) : (
                        t("billing.refill")
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div
              className="rounded-xl border p-5"
              style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
            >
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                {t("billing.transactions")}
              </h4>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                No recent transactions.
              </p>
            </div>
          </div>
        );

      case "history":
        return (
          <div role="tabpanel" aria-labelledby="tab-history" className="space-y-5">
            {isAffiliate ? (
              <>
                <h3 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
                  {t("history.sales")}
                </h3>
                {affiliateProfile ? (
                  <div
                    className="rounded-xl border p-5"
                    style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
                  >
                    <p className="text-sm mb-3" style={{ color: "var(--color-text-muted)" }}>
                      @{affiliateProfile.handle} — {affiliateProfile.brandName}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                            <th className="px-2 py-2 font-medium" style={{ color: "var(--color-text-muted)" }}>Date</th>
                            <th className="px-2 py-2 font-medium" style={{ color: "var(--color-text-muted)" }}>Book</th>
                            <th className="px-2 py-2 font-medium text-right" style={{ color: "var(--color-text-muted)" }}>Comm.</th>
                            <th className="px-2 py-2 font-medium" style={{ color: "var(--color-text-muted)" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {affiliateLedger.map((entry) => (
                            <tr key={entry.id} className="border-b" style={{ borderColor: "var(--color-border,#334155)" }}>
                              <td className="px-2 py-2 whitespace-nowrap" style={{ color: "var(--color-text-muted)" }}>
                                {new Date(entry.timestamp).toLocaleDateString()}
                              </td>
                              <td className="px-2 py-2" style={{ color: "var(--color-text)" }}>{entry.bookTitle}</td>
                              <td className="px-2 py-2 text-right" style={{ color: "#34d399" }}>${entry.commissionSlice.toFixed(2)}</td>
                              <td className="px-2 py-2">
                                <span className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                                  style={{
                                    backgroundColor: entry.status === "paid" ? "color-mix(in srgb, #34d399 20%, transparent)" : entry.status === "approved" ? "color-mix(in srgb, #fbbf24 20%, transparent)" : "color-mix(in srgb, #94a3b8 20%, transparent)",
                                    color: entry.status === "paid" ? "#34d399" : entry.status === "approved" ? "#fbbf24" : "#94a3b8",
                                  }}
                                >
                                  {entry.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                          {affiliateLedger.length === 0 && (
                            <tr><td colSpan={4} className="px-2 py-4 text-center" style={{ color: "var(--color-text-muted)" }}>{t("affiliate.noActivity")}</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{t("affiliate.noActivity")}</p>
                )}
              </>
            ) : (
              <>
                <h3 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
                  {t("history.progress")}
                </h3>
                <div
                  className="rounded-xl border p-5"
                  style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
                >
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {t("progress.title")}
                  </p>
                  <p className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {t("progress.subtitle")}
                  </p>
                  <a
                    href="/progress"
                    className="mt-3 inline-block rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110"
                    style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
                  >
                    {t("history.progress")}
                  </a>
                </div>
              </>
            )}
          </div>
        );

      case "storage":
        return (
          <div role="tabpanel" aria-labelledby="tab-storage" className="space-y-5">
            <h3 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
              {t("controlCenter.storage")}
            </h3>

            {/* Storage progress bar */}
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
            >
              <div className="mb-2 flex items-center justify-between text-xs">
                <span style={{ color: "var(--color-text-muted)" }}>
                  {formatBytes(storageUsed)} / {formatBytes(getLocalStorageLimit())}
                </span>
                <span style={{ color: "var(--color-text)" }}>{storagePercent}%</span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: "var(--color-border,#334155)" }}
                role="progressbar"
                aria-valuenow={storagePercent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${storagePercent}%`,
                    backgroundColor: storagePercent > 80 ? "#ef4444" : storagePercent > 50 ? "#fbbf24" : "var(--color-primary,#6366f1)",
                  }}
                />
              </div>
              <p className="mt-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
                {persona === "owner" ? t("storage.disclosureOwner") : persona === "affiliate" ? t("storage.disclosureAffiliate") : t("storage.disclosureBuyer")}
              </p>
            </div>

            {/* Export */}
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
            >
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                {t("storage.exportBtn")}
              </h4>
              <button
                type="button"
                onClick={handleExport}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110"
                style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
              >
                {t("storage.exportBtn")}
              </button>
            </div>

            {/* Cloud Sync */}
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: "var(--color-border,#334155)", backgroundColor: "var(--color-surface,#1e293b)/30" }}
            >
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                {t("cloud.title")}
              </h4>
              <div className="flex items-center gap-3">
                {cloudStatus.connected ? (
                  <>
                    <span className="rounded-full bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      {t("cloud.connected")}
                    </span>
                    <button
                      type="button"
                      onClick={handleCloudFlush}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-110"
                      style={{ backgroundColor: "var(--color-primary,#6366f1)" }}
                    >
                      {t("cloud.syncNow")}
                    </button>
                    <button
                      type="button"
                      onClick={() => { disconnectCloud(); setCloudStatus(getSyncStatus()); }}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
                      style={{ borderColor: "var(--color-border,#334155)", color: "var(--color-text-muted)" }}
                    >
                      {t("cloud.disconnect")}
                    </button>
                  </>
                ) : (
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {t("cloud.notConnected")}
                  </p>
                )}
              </div>
              {cloudStatus.lastSyncAt && (
                <p className="mt-2 text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  {t("cloud.lastSync")}: {new Date(cloudStatus.lastSyncAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t("controlCenter.title")}
    >
      <div
        className="mx-4 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: "var(--color-bg,#0f172a)",
          borderColor: "var(--color-border,#334155)",
          maxHeight: "85vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-6 py-4"
          style={{ borderColor: "var(--color-border,#334155)" }}
        >
          <h2 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
            {t("controlCenter.title")}
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg p-2 transition-colors hover:opacity-80"
            style={{ color: "var(--color-text-muted)" }}
            aria-label={t("common.close")}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
          {/* Tab navigation - vertical on desktop, horizontal on mobile */}
          <div
            className="flex overflow-x-auto border-b sm:w-48 sm:flex-col sm:border-b-0 sm:border-r"
            style={{ borderColor: "var(--color-border,#334155)" }}
            role="tablist"
            aria-label={t("controlCenter.title")}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors sm:whitespace-normal"
                style={{
                  color: activeTab === tab.id ? "var(--color-primary,#6366f1)" : "var(--color-text-muted)",
                  backgroundColor: activeTab === tab.id ? "color-mix(in srgb, var(--color-primary,#6366f1) 10%, transparent)" : "transparent",
                  borderRight: activeTab === tab.id ? "2px solid var(--color-primary,#6366f1)" : "2px solid transparent",
                }}
              >
                <span aria-hidden="true">{tab.icon}</span>
                <span>{t(tab.labelKey)}</span>
              </button>
            ))}
          </div>

          {/* Tab panel */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderTab(activeTab)}
          </div>
        </div>
      </div>
    </div>
  );
}